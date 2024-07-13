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
