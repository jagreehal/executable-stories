package example

import (
	"testing"

	es "github.com/anthropics/executable-stories/packages/executable-stories-go"
)

func TestMain(m *testing.M) {
	es.RunAndReport(m)
}
