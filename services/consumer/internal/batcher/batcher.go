package batcher

import (
	"log/slog"
	"sync"
	"time"

	chclient "github.com/gravlytics/consumer/internal/clickhouse"
)

// Batcher accumulates events and flushes them in batches to ClickHouse
type Batcher struct {
	ch            *chclient.Client
	maxBatchSize  int
	flushInterval time.Duration
	logger        *slog.Logger

	mu     sync.Mutex
	buffer [][]byte
	timer  *time.Timer
}

// New creates a new Batcher
func New(ch *chclient.Client, maxBatchSize int, flushInterval time.Duration, logger *slog.Logger) *Batcher {
	b := &Batcher{
		ch:            ch,
		maxBatchSize:  maxBatchSize,
		flushInterval: flushInterval,
		logger:        logger,
		buffer:        make([][]byte, 0, maxBatchSize),
	}

	// Start periodic flush timer
	b.timer = time.AfterFunc(flushInterval, b.timerFlush)

	return b
}

// Add adds an event to the batch buffer
func (b *Batcher) Add(event []byte) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.buffer = append(b.buffer, event)

	// Flush if batch is full
	if len(b.buffer) >= b.maxBatchSize {
		b.flushLocked()
	}
}

// Flush forces a flush of the current buffer
func (b *Batcher) Flush() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.flushLocked()
}

// timerFlush is called by the periodic timer
func (b *Batcher) timerFlush() {
	b.Flush()
	b.mu.Lock()
	b.timer.Reset(b.flushInterval)
	b.mu.Unlock()
}

// flushLocked flushes the buffer (must be called with mu held)
func (b *Batcher) flushLocked() {
	if len(b.buffer) == 0 {
		return
	}

	// Take ownership of current buffer
	batch := b.buffer
	b.buffer = make([][]byte, 0, b.maxBatchSize)

	// Insert batch to ClickHouse (in goroutine to not block adds)
	go func() {
		start := time.Now()
		if err := b.ch.InsertBatch(batch); err != nil {
			b.logger.Error("batch insert failed",
				"error", err,
				"batchSize", len(batch),
			)
			// TODO: Implement retry logic or re-queue to Redpanda
			return
		}
		b.logger.Info("batch inserted",
			"batchSize", len(batch),
			"duration", time.Since(start),
		)
	}()
}
