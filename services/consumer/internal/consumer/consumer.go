package consumer

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/gravlytics/consumer/internal/batcher"
	"github.com/twmb/franz-go/pkg/kgo"
)

// Consumer reads events from Redpanda and sends them to the batcher
type Consumer struct {
	client   *kgo.Client
	dlqTopic string
	batcher  *batcher.Batcher
	logger   *slog.Logger
}

// New creates a new Kafka consumer
func New(brokers []string, topic, dlqTopic, group string, b *batcher.Batcher, logger *slog.Logger) (*Consumer, error) {
	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ConsumerGroup(group),
		kgo.ConsumeTopics(topic),
		kgo.FetchMaxBytes(5*1024*1024),       // 5 MB max fetch
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	if err != nil {
		return nil, err
	}

	return &Consumer{
		client:   client,
		dlqTopic: dlqTopic,
		batcher:  b,
		logger:   logger,
	}, nil
}

// Run starts consuming messages until context is cancelled
func (c *Consumer) Run(ctx context.Context) {
	for {
		fetches := c.client.PollFetches(ctx)
		if ctx.Err() != nil {
			return
		}

		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				c.logger.Error("fetch error",
					"topic", e.Topic,
					"partition", e.Partition,
					"error", e.Err,
				)
			}
		}

		fetches.EachRecord(func(record *kgo.Record) {
			// Validate that the message is valid JSON
			var raw json.RawMessage
			if err := json.Unmarshal(record.Value, &raw); err != nil {
				c.logger.Warn("invalid event JSON, sending to DLQ",
					"error", err,
					"offset", record.Offset,
				)
				c.sendToDLQ(ctx, record)
				return
			}

			// Add to batcher
			c.batcher.Add(record.Value)
		})
	}
}

// sendToDLQ sends a failed record to the dead-letter queue
func (c *Consumer) sendToDLQ(ctx context.Context, record *kgo.Record) {
	dlqRecord := &kgo.Record{
		Topic: c.dlqTopic,
		Key:   record.Key,
		Value: record.Value,
		Headers: []kgo.RecordHeader{
			{Key: "original-topic", Value: []byte(record.Topic)},
			{Key: "original-offset", Value: []byte(string(rune(record.Offset)))},
		},
	}

	c.client.Produce(ctx, dlqRecord, func(r *kgo.Record, err error) {
		if err != nil {
			c.logger.Error("failed to send to DLQ", "error", err)
		}
	})
}
