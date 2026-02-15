import {
  BedrockRuntimeClient,
  ConverseCommand,
  ContentBlock,
  Message as BedrockMessage,
  ToolConfiguration,
  ToolChoice as BedrockToolChoice,
  ConverseCommandOutput,
  Tool as BedrockTool,
} from "@aws-sdk/client-bedrock-runtime";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

const getBedrockClient = (): BedrockRuntimeClient => {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
  });
};

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const extractTextFromContent = (content: MessageContent | MessageContent[]): string => {
  const parts = ensureArray(content);
  return parts
    .map(part => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      return "";
    })
    .join("\n");
};

const convertToBedrockContent = (content: MessageContent | MessageContent[]): ContentBlock[] => {
  const parts = ensureArray(content);
  const blocks: ContentBlock[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      blocks.push({ text: part });
    } else if (part.type === "text") {
      blocks.push({ text: part.text });
    } else if (part.type === "image_url") {
      const url = part.image_url.url;
      if (url.startsWith("data:")) {
        const match = url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
          const format = match[1] as "png" | "jpeg" | "gif" | "webp";
          const base64Data = match[2];
          blocks.push({
            image: {
              format,
              source: {
                bytes: Buffer.from(base64Data, "base64"),
              },
            },
          });
        }
      }
    }
  }

  return blocks.length > 0 ? blocks : [{ text: "" }];
};

const convertMessages = (
  messages: Message[]
): { system: string | undefined; bedrockMessages: BedrockMessage[] } => {
  let systemPrompt: string | undefined;
  const bedrockMessages: BedrockMessage[] = [];
  const toolResultsMap = new Map<string, string>();

  for (const msg of messages) {
    if (msg.role === "tool" || msg.role === "function") {
      if (msg.tool_call_id) {
        toolResultsMap.set(msg.tool_call_id, extractTextFromContent(msg.content));
      }
    }
  }

  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt = extractTextFromContent(msg.content);
    } else if (msg.role === "user") {
      bedrockMessages.push({
        role: "user",
        content: convertToBedrockContent(msg.content),
      });
    } else if (msg.role === "assistant") {
      bedrockMessages.push({
        role: "assistant",
        content: convertToBedrockContent(msg.content),
      });
    } else if (msg.role === "tool" || msg.role === "function") {
      if (msg.tool_call_id) {
        bedrockMessages.push({
          role: "user",
          content: [
            {
              toolResult: {
                toolUseId: msg.tool_call_id,
                content: [{ text: extractTextFromContent(msg.content) }],
              },
            },
          ],
        });
      }
    }
  }

  return { system: systemPrompt, bedrockMessages };
};

const convertTools = (tools: Tool[]): ToolConfiguration => {
  return {
    tools: tools.map(tool => ({
      toolSpec: {
        name: tool.function.name,
        description: tool.function.description,
        inputSchema: tool.function.parameters
          ? { json: tool.function.parameters }
          : { json: { type: "object", properties: {} } },
      },
    })) as BedrockTool[],
  };
};

const convertToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): BedrockToolChoice | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none") {
    return undefined;
  }

  if (toolChoice === "auto") {
    return { auto: {} };
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }
    if (tools.length === 1) {
      return { tool: { name: tools[0].function.name } };
    }
    return { any: {} };
  }

  if ("name" in toolChoice) {
    return { tool: { name: toolChoice.name } };
  }

  if ("function" in toolChoice && toolChoice.function?.name) {
    return { tool: { name: toolChoice.function.name } };
  }

  return undefined;
};

const convertBedrockResponse = (
  response: ConverseCommandOutput,
  model: string
): InvokeResult => {
  const output = response.output;
  const messageContent = output?.message?.content || [];

  let textContent = "";
  const toolCalls: ToolCall[] = [];

  for (const block of messageContent) {
    if ("text" in block && block.text) {
      textContent += block.text;
    } else if ("toolUse" in block && block.toolUse) {
      toolCalls.push({
        id: block.toolUse.toolUseId || `tool_${Date.now()}`,
        type: "function",
        function: {
          name: block.toolUse.name || "",
          arguments: JSON.stringify(block.toolUse.input || {}),
        },
      });
    }
  }

  const finishReason = response.stopReason === "tool_use" ? "tool_calls" : "stop";

  return {
    id: `bedrock-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: finishReason,
      },
    ],
    usage: response.usage
      ? {
          prompt_tokens: response.usage.inputTokens || 0,
          completion_tokens: response.usage.outputTokens || 0,
          total_tokens: (response.usage.inputTokens || 0) + (response.usage.outputTokens || 0),
        }
      : undefined,
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    maxTokens,
    max_tokens,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const client = getBedrockClient();
  const { system, bedrockMessages } = convertMessages(messages);

  const resolvedMaxTokens = maxTokens || max_tokens || 4096;

  const commandInput: {
    modelId: string;
    messages: BedrockMessage[];
    system?: Array<{ text: string }>;
    inferenceConfig: { maxTokens: number };
    toolConfig?: ToolConfiguration;
  } = {
    modelId: MODEL_ID,
    messages: bedrockMessages,
    inferenceConfig: {
      maxTokens: resolvedMaxTokens,
    },
  };

  if (system) {
    commandInput.system = [{ text: system }];
  }

  if (tools && tools.length > 0) {
    const toolConfig = convertTools(tools);
    const bedrockToolChoice = convertToolChoice(toolChoice || tool_choice, tools);
    if (bedrockToolChoice) {
      toolConfig.toolChoice = bedrockToolChoice;
    }
    commandInput.toolConfig = toolConfig;
  }

  const format = responseFormat || response_format;
  const schema = outputSchema || output_schema;
  if (format?.type === "json_object" || format?.type === "json_schema" || schema) {
    if (system) {
      commandInput.system = [
        { text: `${system}\n\nYou must respond with valid JSON only, no other text.` },
      ];
    } else {
      commandInput.system = [{ text: "You must respond with valid JSON only, no other text." }];
    }
  }

  const command = new ConverseCommand(commandInput);
  const response = await client.send(command);

  return convertBedrockResponse(response, MODEL_ID);
}
