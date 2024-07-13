provider "aws" {
  region  = "${var.aws_primary_region}"
  profile = "${var.aws_tf_profile}"
}
