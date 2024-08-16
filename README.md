# ChartJs Lambda Renderer

Chartjs-lambda-renderer is a standalone AWS Lambda function designed to render Chart.js charts as images. Running Chart.js on the server side from Node.js can involve dependencies that are tricky to install within Lambda’s environment. By using a Docker image, this package simplifies the process, providing a reliable and isolated service for generating chart images. This separation ensures that the complexities of Chart.js and its dependencies do not interfere with other dependencies in your functions that need to render ChartJS charts.

## Example Usage

Invoke the chartjs-renderer Lambda function directly using the AWS SDK.  The input payload you pass to the Lambda function should be a JSON object with the following properties:

`width`: The width of the chart in pixels.
`height`: The height of the chart in pixels.
`backgroundColour`: The background color of the chart. This can be any valid CSS color value.
`configuration`: The configuration object for Chart.js. This is exactly the same as what you would pass to Chart.js in a client-side or server-side implementation.

```javascript
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const lambda = new AWS.Lambda();

const params = {
  FunctionName: 'bsa-chartjs-renderer',
  Payload: JSON.stringify({
    width: 400,
    height: 400,
    backgroundColour: '#ffffff',
    // The 'configuration' object is the same as what you would pass directly to Chart.js
    configuration: {
      type: 'bar',
      data: {
        labels: ['January', 'February', 'March', 'April'],
        datasets: [{
          label: 'Sales',
          data: [10, 20, 30, 40]
        }]
      },
      options: {}
    }
  })
};

(async () => {
  try {
    const data = await lambda.invoke(params).promise();
    const payload = JSON.parse(data.Payload);

    if (payload.body) {
      const imageBuffer = Buffer.from(payload.body, 'base64');
      const filePath = path.resolve(__dirname, 'chart.png');
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`Image saved to ${filePath}`);
    } else {
      console.error('No image data returned');
    }
  } catch (err) {
    console.error(`Error invoking chartjs-renderer Lambda: ${err.stack}`);
  }
})();
```

Note that you need to grant the Lambda permission to be executed by the caller first.  The `aws_lambda_permission` blocks in the provided Terraform module allow any Lambda function within the AWS account to call it and also references a developer role in the `env-dev.tfvars` file.  Setup your local development environment using this role in your profile so your local code can also invoke the Lambda function.

## Build Locally

```shell
# one-time setup for docker buildx to build on multiple architectures
docker buildx create --use
docker buildx inspect --bootstrap

# build the image with buildx
export PLATFORM=linux/arm64 && export TARGETARCH=$PLATFORM
docker buildx build --platform $PLATFORM -t bestselfapp/chartjs-lambda-renderer:latest --load .
```

Problems doing `npm i` locally?  You might have to build the container as above and copy the `node_modules` directory out from the container to the local path via:

```shell
docker run --name chartjs-lambda-renderer -d bestselfapp/chartjs-lambda-renderer:latest
docker cp chartjs-lambda-renderer:/var/task/node_modules ./node_modules
docker stop chartjs-lambda-renderer
docker rm chartjs-lambda-renderer
```

## Test Locally

```shell
export AWS_ENV="dev" && export AWS_PROFILE="bsa$AWS_ENV"
export PLATFORM=linux/arm64 && export TARGETARCH=$PLATFORM
docker run -it --rm --platform=$PLATFORM \
    -e LOG_LEVEL=debug \
    -e LOCAL_DEBUG_OUTPUT_MODE=true \
    --entrypoint mocha \
    bestselfapp/chartjs-lambda-renderer:latest
```

## Create Infrastructure

Need to download latest terraform binary?  It can be hard to find:
https://releases.hashicorp.com/terraform/1.5.1/

```shell
export AWS_ENV="dev" && export AWS_PROFILE="bsa$AWS_ENV"
# put the tfvars variables into environment variables
cd terraform
# configure the tf backend (remote-state)
terraform init \
    -backend-config="bucket=bsa-tfstate-${AWS_ENV}" \
    -backend-config="key=chartjs-lambda-renderer-us-east-1/terraform.tfstate" \
    -backend-config="region=us-east-1" \
    -backend-config="dynamodb_table=tfstate_${AWS_ENV}"
# apply
terraform apply -var-file env-$AWS_ENV.tfvars
``` 

## Deploy

Commit to develop/master branches to trigger the GitHub Actions pipeline to deploy to dev/prod.  This microservice just uses Terraform and the GitHub Actions workflow to deploy the container image that Lambda uses to ECR, there is no local deploy script.  You will need the following secrets set in the 'Actions secrets and variables' section of your GitHub repo.  These need to be credentials to an IAM role with sufficient privileges to apply the Terraform.

* AWS_ACCESS_KEY_ID_DEV
* AWS_SECRET_ACCESS_KEY_DEV
* AWS_ACCESS_KEY_ID_PROD
* AWS_SECRET_ACCESS_KEY_PROD

## Test

```shell
export AWS_ENV="dev" && export AWS_PROFILE="bsa$AWS_ENV"
export PLATFORM=linux/arm64 && export TARGETARCH=$PLATFORM

# make sure to build first, we're not passing in the local volume
docker run -it --rm --platform=$PLATFORM \
    -e LOG_LEVEL=debug \
    -e LOCAL_DEBUG_OUTPUT_MODE=true \
    --entrypoint mocha \
    bestselfapp/chartjs-lambda-renderer:latest

# this is the proper way to run it to mimic Lambda, but for our purposes if we are running it locally to test changes to it, use the above to run with mocha
docker run -it --rm --platform=$PLATFORM \
    -e LOG_LEVEL=debug \
    bestselfapp/chartjs-lambda-renderer:latest \
    index.handler
```
