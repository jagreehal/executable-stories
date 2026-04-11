# frozen_string_literal: true

module ExecutableStories
  module DocEntry
    module_function

    def note(text, children: nil)
      entry = { "kind" => "note", "text" => text, "phase" => "runtime" }
      apply_children(entry, children)
    end

    def tag(*names, children: nil)
      entry = { "kind" => "tag", "names" => names.flatten, "phase" => "runtime" }
      apply_children(entry, children)
    end

    def kv(label, value, children: nil)
      entry = { "kind" => "kv", "label" => label, "value" => value, "phase" => "runtime" }
      apply_children(entry, children)
    end

    def json_doc(label, value, children: nil)
      require "json"
      content = JSON.pretty_generate(value)
      entry = { "kind" => "code", "label" => label, "content" => content, "lang" => "json", "phase" => "runtime" }
      apply_children(entry, children)
    end

    def code(label, content, lang: nil, children: nil)
      entry = { "kind" => "code", "label" => label, "content" => content, "phase" => "runtime" }
      entry["lang"] = lang if lang
      apply_children(entry, children)
    end

    def table(label, columns, rows, children: nil)
      entry = { "kind" => "table", "label" => label, "columns" => columns, "rows" => rows, "phase" => "runtime" }
      apply_children(entry, children)
    end

    def link(label, url, children: nil)
      entry = { "kind" => "link", "label" => label, "url" => url, "phase" => "runtime" }
      apply_children(entry, children)
    end

    def section(title, markdown, children: nil)
      entry = { "kind" => "section", "title" => title, "markdown" => markdown, "phase" => "runtime" }
      apply_children(entry, children)
    end

    def mermaid(code, title: nil, children: nil)
      entry = { "kind" => "mermaid", "code" => code, "phase" => "runtime" }
      entry["title"] = title if title
      apply_children(entry, children)
    end

    def screenshot(path, alt: nil, children: nil)
      entry = { "kind" => "screenshot", "path" => path, "phase" => "runtime" }
      entry["alt"] = alt if alt
      apply_children(entry, children)
    end

    def custom(type, data, children: nil)
      entry = { "kind" => "custom", "type" => type, "data" => data, "phase" => "runtime" }
      apply_children(entry, children)
    end

    def apply_children(entry, children)
      return entry unless children && !children.empty?

      entry["children"] = children.map { |c| c.is_a?(Hash) ? c : c.to_h }
      entry
    end
  end
end