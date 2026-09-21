package producer

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kgo"
)

// Producer wraps a franz-go Kafka producer for Redpanda
type Producer struct {
	client *kgo.Client
	topic  string
}

// New creates a new Redpanda producer
func New(brokers []string, topic string) (*Producer, error) {
	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.DefaultProduceTopic(topic),
		kgo.ProducerBatchMaxBytes(1024*1024),    // 1 MB max batch
		kgo.ProducerBatchCompression(kgo.SnappyCompression()),
		kgo.AllowAutoTopicCreation(),
	)
	if err != nil {
		return nil, fmt.Errorf("create kafka client: %w", err)
	}

	return &Producer{
		client: client,
		topic:  topic,
	}, nil
}

// Send produces a message to the configured topic
// Uses siteID as the partition key for ordering
func (p *Producer) Send(ctx context.Context, key string, value []byte) error {
	record := &kgo.Record{
		Key:   []byte(key),
		Value: value,
	}

	// Produce synchronously (blocks until ack)
	results := p.client.ProduceSync(ctx, record)
	if err := results.FirstErr(); err != nil {
		return fmt.Errorf("produce message: %w", err)
	}

	return nil
}

// Close shuts down the producer gracefully
func (p *Producer) Close() {
	p.client.Close()
}
