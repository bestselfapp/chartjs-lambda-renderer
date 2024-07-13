resource "aws_ecr_repository" "chartjs_renderer" {
  name = "bestselfapp/chartjs-lambda-renderer"
}

resource "aws_ecr_lifecycle_policy" "chartjs_renderer" {
  repository = aws_ecr_repository.chartjs_lambda_renderer.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove all untagged images"
        selection    = {
          tagStatus     = "untagged"
          countType     = "imageCountMoreThan"
          countNumber   = 1
        }
        action       = {
          type = "expire"
        }
      }
    ]
  })

}
