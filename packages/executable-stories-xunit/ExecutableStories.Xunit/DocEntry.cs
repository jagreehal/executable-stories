using System.Text.Json;
using System.Text.Json.Serialization;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// Represents a documentation entry attached to a story or step.
    /// Uses a Dictionary-based approach to handle the discriminated union on the "kind" field,
    /// since each kind has different fields. Null values are omitted during serialization.
    /// </summary>
    [JsonConverter(typeof(DocEntryJsonConverter))]
    public class DocEntry
    {
        private static readonly JsonSerializerOptions s_indentedOptions = new() { WriteIndented = true };

        public DocEntry() { }

        public Dictionary<string, object?> Fields { get; } = [];

        public void Set(string key, object? value)
        {
            Fields[key] = value;
        }

        public object? Get(string key)
        {
            return Fields.TryGetValue(key, out var value) ? value : null;
        }

        public string? Kind => Get("kind")?.ToString();

        // ========================================================================
        // Factory methods
        // ========================================================================

        public static DocEntry Note(string text, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "note");
            entry.Set("text", text);
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Tag(string[] names, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "tag");
            entry.Set("names", names.ToList());
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Tag(params string[] names)
        {
            return Tag(names, null);
        }

        public static DocEntry Kv(string label, object value, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "kv");
            entry.Set("label", label);
            entry.Set("value", value);
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Code(string label, string content, string? lang = null, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "code");
            entry.Set("label", label);
            entry.Set("content", content);
            if (lang != null)
            {
                entry.Set("lang", lang);
            }
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Json(string label, object value, DocEntry[]? children = null)
        {
            string content;
            if (value is string s)
            {
                content = s;
            }
            else
            {
                try
                {
                    content = JsonSerializer.Serialize(value, s_indentedOptions);
                }
                catch
                {
                    content = value?.ToString() ?? "";
                }
            }
            return Code(label, content, "json", children);
        }

        /// <summary>
        /// JSON-serializable snapshot of the world at this step (kind=state).
        /// <paramref name="label"/> names the entity ('Basket') so the renderer can
        /// diff consecutive snapshots; it is omitted from JSON when null.
        /// </summary>
        public static DocEntry State(object value, string? label = null, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "state");
            if (label != null)
            {
                entry.Set("label", label);
            }
            entry.Set("value", value);
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Table(string label, string[] columns, string[][] rows, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "table");
            entry.Set("label", label);
            entry.Set("columns", columns.ToList());
            entry.Set("rows", rows.Select(r => r.ToList()).ToList());
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Link(string label, string url, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "link");
            entry.Set("label", label);
            entry.Set("url", url);
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Section(string title, string markdown, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "section");
            entry.Set("title", title);
            entry.Set("markdown", markdown);
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Mermaid(string code, string? title = null, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "mermaid");
            entry.Set("code", code);
            if (title != null)
            {
                entry.Set("title", title);
            }
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Screenshot(string path, string? alt = null, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "screenshot");
            entry.Set("path", path);
            if (alt != null)
            {
                entry.Set("alt", alt);
            }
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        /// <summary>
        /// Video recording of the scenario, played inline in the HTML report.
        /// </summary>
        /// <param name="path">Path to the video file.</param>
        /// <param name="caption">Caption shown beneath the player.</param>
        /// <param name="poster">Still image shown before playback starts.</param>
        /// <param name="children">Nested entries grouped under this one.</param>
        public static DocEntry Video(string path, string? caption = null, string? poster = null, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "video");
            entry.Set("path", path);
            if (caption != null)
            {
                entry.Set("caption", caption);
            }
            if (poster != null)
            {
                entry.Set("poster", poster);
            }
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        /// <summary>
        /// Embedded HTML rendered inside an always-sandboxed iframe. Exactly one of
        /// <paramref name="path"/>, <paramref name="url"/>, or <paramref name="content"/>
        /// must be set, or an <see cref="ArgumentException"/> is thrown.
        /// </summary>
        public static DocEntry Html(
            string? path = null,
            string? url = null,
            string? content = null,
            string? title = null,
            object? height = null,
            DocEntry[]? children = null)
        {
            var sources = (path != null ? 1 : 0) + (url != null ? 1 : 0) + (content != null ? 1 : 0);
            if (sources != 1)
            {
                throw new ArgumentException("Story.Html requires exactly one of path, url, or content");
            }
            var entry = new DocEntry();
            entry.Set("kind", "html");
            entry.Set("phase", "runtime");
            if (path != null)
            {
                entry.Set("path", path);
            }
            if (url != null)
            {
                entry.Set("url", url);
            }
            if (content != null)
            {
                entry.Set("content", content);
            }
            if (title != null)
            {
                entry.Set("title", title);
            }
            if (height != null)
            {
                entry.Set("height", height);
            }
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }

        public static DocEntry Custom(string type, object data, DocEntry[]? children = null)
        {
            var entry = new DocEntry();
            entry.Set("kind", "custom");
            entry.Set("type", type);
            entry.Set("data", data);
            entry.Set("phase", "runtime");
            if (children is { Length: > 0 })
            {
                entry.Set("children", children);
            }
            return entry;
        }
    }

    /// <summary>
    /// Custom JSON converter for DocEntry that serializes the internal dictionary
    /// as a flat JSON object, omitting null values.
    /// </summary>
    public class DocEntryJsonConverter : JsonConverter<DocEntry>
    {
        public override DocEntry Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var entry = new DocEntry();
            if (reader.TokenType != JsonTokenType.StartObject)
            {
                throw new JsonException();
            }

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndObject)
                {
                    return entry;
                }

                if (reader.TokenType != JsonTokenType.PropertyName)
                {
                    throw new JsonException();
                }

                var propertyName = reader.GetString()!;
                _ = reader.Read();

                var value = reader.TokenType switch
                {
                    JsonTokenType.String => reader.GetString(),
                    JsonTokenType.Number => reader.TryGetInt64(out var l) ? l : reader.GetDouble(),
                    JsonTokenType.True => true,
                    JsonTokenType.False => false,
                    JsonTokenType.Null => null,
                    JsonTokenType.None => throw new NotImplementedException(),
                    JsonTokenType.StartObject => throw new NotImplementedException(),
                    JsonTokenType.EndObject => throw new NotImplementedException(),
                    JsonTokenType.StartArray => throw new NotImplementedException(),
                    JsonTokenType.EndArray => throw new NotImplementedException(),
                    JsonTokenType.PropertyName => throw new NotImplementedException(),
                    JsonTokenType.Comment => throw new NotImplementedException(),
                    _ => JsonSerializer.Deserialize<object>(ref reader, options)
                };

                entry.Set(propertyName, value);
            }

            throw new JsonException();
        }

        public override void Write(Utf8JsonWriter writer, DocEntry value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            foreach (KeyValuePair<string, object?> kvp in value.Fields)
            {
                if (kvp.Value is null)
                {
                    continue;
                }

                writer.WritePropertyName(kvp.Key);
                JsonSerializer.Serialize(writer, kvp.Value, kvp.Value.GetType(), options);
            }
            writer.WriteEndObject();
        }
    }
}
