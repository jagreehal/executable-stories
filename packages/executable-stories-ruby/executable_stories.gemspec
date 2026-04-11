Gem::Specification.new do |spec|
  spec.name = "executable-stories-ruby"
  spec.version = "0.1.0"
  spec.authors = ["Jag Reehal"]
  spec.email = ["jag@jagreehal.com"]

  spec.summary = "Ruby-first story/given/when/then helpers for Minitest with doc generation."
  spec.description = "BDD story testing library for Ruby. Tests and documentation from the same code."
  spec.homepage = "https://github.com/jagreehal/executable-stories"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.1"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-ruby"
  spec.metadata["changelog_uri"] = "https://github.com/jagreehal/executable-stories/releases"

  spec.files = Dir.glob("lib/**/*.rb")
  spec.bindir = "exe"
  spec.executables = Dir.glob("exe/*")
  spec.require_paths = ["lib"]

  spec.add_development_dependency "minitest", "~> 5.0"
  spec.add_development_dependency "rake", "~> 13.0"
  spec.add_development_dependency "rubocop", "~> 1.50"
end
