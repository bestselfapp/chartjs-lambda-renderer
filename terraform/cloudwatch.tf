resource "aws_cloudwatch_metric_alarm" "chartjs_renderer" {
  alarm_name                = "bsa-chartjs-renderer-lambda-throttled"
  comparison_operator       = "GreaterThanOrEqualToThreshold"
  evaluation_periods        = 1
  metric_name               = "Throttles"
  namespace                 = "AWS/Lambda"
  period                    = 60
  statistic                 = "Sum"
  threshold                 = 1
  alarm_description         = "Report Generator Lambda Throttled"
  dimensions = {
    FunctionName = aws_lambda_function.chartjs_renderer.function_name
  }
  alarm_actions = [aws_sns_topic.lambda_throttled.arn]
}

resource "aws_sns_topic" "lambda_throttled" {
  name = "bsa-chartjs-renderer-lambda-throttled"
}

resource "aws_sns_topic_subscription" "lambda_throttled_email" {
  topic_arn = aws_sns_topic.lambda_throttled.arn
  protocol  = "email"
  endpoint  = "ops+${var.aws_env}@bestselfapp.xyz"
}
