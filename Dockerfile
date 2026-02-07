# Dockerfile

# Use the official Node.js image as the base image
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire application to the container
COPY . .

# Build the Vite application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD [ "npm", "run", "start" ]
