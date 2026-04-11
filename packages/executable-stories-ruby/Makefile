.PHONY: test lint build clean

test:
	bundle exec ruby -Ilib -Itest test/test_story.rb

lint:
	bundle exec rubocop lib/ test/

build:
	gem build executable_stories.gemspec

clean:
	rm -f *.gem
	rm -rf .executable-stories/