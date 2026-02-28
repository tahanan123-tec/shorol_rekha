FROM rabbitmq:3-management-alpine

# Enable management plugin
RUN rabbitmq-plugins enable --offline rabbitmq_management

# Copy definitions
COPY definitions.json /etc/rabbitmq/definitions.json

EXPOSE 5672 15672
