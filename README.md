# ChartJs Lambda Renderer

Chartjs-lambda-renderer is a standalone AWS Lambda function designed to render Chart.js charts as images. Running Chart.js on a server with Node.js can involve dependencies that are tricky to install within Lambda’s environment. By using a Docker image, this package simplifies the process, providing a reliable and isolated service for generating chart images. This separation ensures that the complexities of Chart.js and its dependencies do not interfere with other dependencies in your functions that need to render ChartJS charts.

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
    -backend-config="region=${aws_primary_region}" \
    -backend-config="dynamodb_table=tfstate_${AWS_ENV}"
# apply
terraform apply -var-file env-$AWS_ENV.tfvars
``` 

## Deploy

Commit to develop/master branches to trigger the GitHub Actions pipeline to deploy to dev/prod.  This microservice just uses Terraform and the GitHub Actions workflow to deploy the container image that Lambda uses to ECR, there is no local deploy script.  The Serverless Framework is not used for this service.  SLS had an issue running inside the Amazon container image, wanting a license key, which was the initial thing that led me towards Terraform.

## Test

```shell
export AWS_ENV="dev" && export AWS_PROFILE="bsa$AWS_ENV"
export PLATFORM=linux/arm64 && export TARGETARCH=$PLATFORM



# Add this to force it to immediately send a test email (make sure
# LOCAL_DEBUG_OUTPUT_MODE is false when trying this)
#     -e LOCAL_DEBUG_SENDNOW_MODE=true \

# this is technically the way to run it but use the above to run with mocha
docker run -it --rm --platform=$PLATFORM \
    -v $(pwd):/var/task \
    -v ~/.aws/:/root/.aws/ \
    -e AWS_ENV -e AWS_PROFILE \
    --env-file env-dev.env \
    -e LOCAL_DEBUG_OUTPUT_MODE=true \
    bestselfapp/report-generator-lambdaimage:latest \
    index.handler
```

## Test Payload in Lambda

To test the Lambda function in AWS, here is a valid test message, as the service expects to receive the payload from SNS so it would be wrapped in an SNS envelope.  Note that the below is an incomplete SNS message but good enough for testing.

```json
{
    "Records": [
        {
            "EventSource": "aws:sns",
            "EventVersion": "1.0",
            "Sns": {
                "Type": "Notification",
                "MessageId": "12345678-1234-1234-1234-123456789012",
                "TopicArn": "arn:aws:sns:us-west-2:123456789012:MyTopic",
                "Subject": "BestSelfApp",
                "Message": "{\"reportName\":\"progressEmailReport\",\"projectId\":\"0\",\"userId\":\"42606309\",\"timeSpanEnum\":\"last7days\"}"
            }
        }
    ]
}
```
