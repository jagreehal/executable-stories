package es

import (
	"os"
	"sync"
	"time"
)

var (
	mu        sync.Mutex
	collected []RawTestCase
	startTime time.Time
	orderSeq  int
)

// record adds a completed test case to the global collection.
func record(tc RawTestCase) {
	mu.Lock()
	defer mu.Unlock()
	collected = append(collected, tc)
}

// getAll returns a copy of all collected test cases.
func getAll() []RawTestCase {
	mu.Lock()
	defer mu.Unlock()
	result := make([]RawTestCase, len(collected))
	copy(result, collected)
	return result
}

// nextOrder returns the next source order number, incrementing the sequence.
func nextOrder() int {
	mu.Lock()
	defer mu.Unlock()
	n := orderSeq
	orderSeq++
	return n
}

// reset clears the global collector state. Used for testing.
func reset() {
	mu.Lock()
	defer mu.Unlock()
	collected = nil
	orderSeq = 0
	startTime = time.Time{}
}

// detectCI detects the CI environment from environment variables.
// Precedence: GitHub Actions > CircleCI > Jenkins > Travis > GitLab CI > generic CI.
func detectCI() *RawCIInfo {
	if os.Getenv("GITHUB_ACTIONS") == "true" {
		url := ""
		server := os.Getenv("GITHUB_SERVER_URL")
		repo := os.Getenv("GITHUB_REPOSITORY")
		runID := os.Getenv("GITHUB_RUN_ID")
		if server != "" && repo != "" && runID != "" {
			url = server + "/" + repo + "/actions/runs/" + runID
		}
		ci := &RawCIInfo{Name: "github", BuildNumber: os.Getenv("GITHUB_RUN_NUMBER")}
		if url != "" {
			ci.URL = url
		}
		return ci
	}
	if os.Getenv("CIRCLECI") == "true" {
		return &RawCIInfo{
			Name:        "circleci",
			BuildNumber: os.Getenv("CIRCLE_BUILD_NUM"),
			URL:         os.Getenv("CIRCLE_BUILD_URL"),
		}
	}
	if os.Getenv("JENKINS_URL") != "" {
		return &RawCIInfo{
			Name:        "jenkins",
			BuildNumber: os.Getenv("BUILD_NUMBER"),
			URL:         os.Getenv("BUILD_URL"),
		}
	}
	if os.Getenv("TRAVIS") == "true" {
		return &RawCIInfo{
			Name:        "travis",
			BuildNumber: os.Getenv("TRAVIS_BUILD_NUMBER"),
			URL:         os.Getenv("TRAVIS_BUILD_WEB_URL"),
		}
	}
	if os.Getenv("GITLAB_CI") == "true" {
		return &RawCIInfo{
			Name:        "gitlab",
			BuildNumber: os.Getenv("CI_PIPELINE_IID"),
			URL:         os.Getenv("CI_PIPELINE_URL"),
		}
	}
	if os.Getenv("CI") == "true" {
		return &RawCIInfo{Name: "ci"}
	}
	return nil
}
