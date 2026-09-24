import os

# Update frontend/Dockerfile
with open('frontend/Dockerfile', 'r') as f:
    content = f.read()
content = content.replace('FROM node:22-alpine', 'FROM public.ecr.aws/docker/library/node:22-alpine')
content = content.replace('FROM nginx:latest', 'FROM public.ecr.aws/docker/library/nginx:latest')
with open('frontend/Dockerfile', 'w') as f:
    f.write(content)

# Update backend/Dockerfile
with open('backend/Dockerfile', 'r') as f:
    content = f.read()
content = content.replace('FROM node:22-slim', 'FROM public.ecr.aws/docker/library/node:22-slim')
with open('backend/Dockerfile', 'w') as f:
    f.write(content)

# Update docker-compose.prod.yml
with open('docker-compose.prod.yml', 'r') as f:
    content = f.read()
content = content.replace('image: postgres:15-alpine', 'image: public.ecr.aws/docker/library/postgres:15-alpine')
content = content.replace('image: redis:7-alpine', 'image: public.ecr.aws/docker/library/redis:7-alpine')
with open('docker-compose.prod.yml', 'w') as f:
    f.write(content)
