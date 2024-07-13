FROM --platform=$BUILDPLATFORM public.ecr.aws/lambda/nodejs:18-arm64 AS runtime

# Set the working directory
WORKDIR /var/task

# Copy package.json to leverage Docker cache
COPY package.json ./

# Install development tools and libraries needed for building canvas
RUN yum update -y && \
    yum groupinstall "Development Tools" -y && \
    yum install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel librsvg2-devel pango-devel bzip2-devel jq python3 -y && \
    yum install pixman-devel -y && \
    yum install libX11-devel libXext-devel libXrender-devel libXtst-devel -y

# Install npm dependencies, including canvas and dev dependencies
RUN npm install canvas --build-from-source && \
    npm install && \
    npm install chai sinon mocha --save-dev

# Copy the rest of the application code
COPY . .

# Ensure the local node_modules/.bin directory is in the PATH
ENV PATH /var/task/node_modules/.bin:$PATH

# Set the CMD to your handler (index.handler in this case)
CMD [ "index.handler" ]
