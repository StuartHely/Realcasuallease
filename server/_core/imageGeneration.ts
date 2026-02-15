/**
 * Image generation helper using AWS Bedrock Stable Diffusion XL
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing (uses image-to-image with init_image):
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { storagePut } from "server/storage";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient | null {
  if (bedrockClient) return bedrockClient;

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    console.warn(
      "AWS credentials not configured for Bedrock image generation. " +
        "Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY."
    );
    return null;
  }

  bedrockClient = new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return bedrockClient;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const client = getBedrockClient();

  if (!client) {
    console.warn(
      "Bedrock image generation not available - returning null. " +
        "Ensure AWS credentials are configured and Stable Diffusion XL is available in your region."
    );
    return { url: undefined };
  }

  try {
    let initImage: string | undefined;
    if (options.originalImages && options.originalImages.length > 0) {
      const firstImage = options.originalImages[0];
      if (firstImage.b64Json) {
        initImage = firstImage.b64Json;
      } else if (firstImage.url) {
        initImage = await fetchImageAsBase64(firstImage.url);
      }
    }

    const requestBody: Record<string, unknown> = {
      text_prompts: [
        {
          text: options.prompt,
          weight: 1.0,
        },
      ],
      cfg_scale: 7,
      steps: 30,
      seed: Math.floor(Math.random() * 2147483647),
      width: 1024,
      height: 1024,
    };

    if (initImage) {
      requestBody.init_image = initImage;
      requestBody.image_strength = 0.35;
    }

    const command = new InvokeModelCommand({
      modelId: "stability.stable-diffusion-xl-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);

    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    ) as {
      artifacts: Array<{
        base64: string;
        finishReason: string;
      }>;
    };

    if (!responseBody.artifacts || responseBody.artifacts.length === 0) {
      throw new Error("No image artifacts returned from Bedrock");
    }

    const artifact = responseBody.artifacts[0];
    if (artifact.finishReason === "CONTENT_FILTERED") {
      throw new Error("Image generation was blocked by content filter");
    }

    const buffer = Buffer.from(artifact.base64, "base64");

    const { url } = await storagePut(
      `generated/${Date.now()}.png`,
      buffer,
      "image/png"
    );

    return { url };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("AccessDeniedException") ||
      errorMessage.includes("UnrecognizedClientException") ||
      errorMessage.includes("not supported in this region")
    ) {
      console.warn(
        `Bedrock image generation not available in this region or model not enabled: ${errorMessage}`
      );
      return { url: undefined };
    }

    throw new Error(`Image generation failed: ${errorMessage}`);
  }
}
