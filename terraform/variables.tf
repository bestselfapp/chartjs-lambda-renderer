data "aws_caller_identity" "current" {}

variable "aws_primary_region" {
}

variable "aws_tf_profile" {
}

variable "aws_env" {
}

variable "image_tag" {
  default = "latest"
}

variable "developer_role_arn" {
  description = "The ARN of the role developers use locally to execute this Lambda with."
}

variable "log_level" {
  description = "The LOG_LEVEL environment variable value given to the Lambda function."
}
