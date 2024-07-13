resource "aws_lambda_function" "chartjs_renderer" {
  function_name = "bsa-chartjs-renderer"
  role          = aws_iam_role.lambda_execution_role.arn
  # handler       = "index.handler"
  # runtime       = "nodejs18.x"
  memory_size   = 2048
  timeout       = 30
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.chartjs_renderer.repository_url}:${var.image_tag}"
  architectures = ["arm64"]

  environment {
    variables = {
      LOG_LEVEL                        = "debug"
    }
  }
}

# Allow any Lambda function to call this Lambda function
resource "aws_lambda_permission" "allow_any_lambda_function" {
  statement_id  = "AllowExecutionFromAnyLambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chartjs_renderer.function_name
  principal     = "lambda.amazonaws.com"
  source_arn    = "arn:aws:lambda:${var.aws_primary_region}:${data.aws_caller_identity.current.account_id}:function:*"
}

# Allow the local AWS profile to call this Lambda function
resource "aws_lambda_permission" "allow_iam_role_invocation" {
  statement_id  = "AllowExecutionFromIAMRole"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chartjs_renderer.function_name
  principal     = "lambda.amazonaws.com"
  source_arn    = "arn:aws:iam::805071920706:role/OrganizationAccountAccessRole"
}

resource "aws_iam_role" "lambda_execution_role" {
  name = "chartjs_renderer_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_policy" "lambda_basic_policy" {
  name        = "lambda_basic_policy"
  description = "Basic execution policy for Lambda"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_basic_policy.arn
}
