using System.Text.Json;
using System.Text.Json.Serialization;

namespace ExecutableStories.Xunit;

/// <summary>
/// Represents a documentation entry attached to a story or step.
/// Uses a Dictionary-based approach to handle the discriminated union on the "kind" field,
/// since each kind has different fields. Null values are omitted during serialization.
/// </summary>
[JsonConverter(typeof(DocEntryJsonConverter))]
public class DocEntry
{
    private readonly Dictionary<string, object?> _fields = new();

    public DocEntry() { }

    private DocEntry(Dictionary<string, object?> fields)
    {
        foreach (var kvp in fields)
        {
            _fields[kvp.Key] = kvp.Value;
        }
    }

    public Dictionary<string, object?> Fields => _fields;

    public void Set(string key, object? value)
    {
        _fields[key] = value;
    }

    public object? Get(string key)
    {
        return _fields.TryGetValue(key, out var value) ? value : null;
    }

    public string? Kind => Get("kind")?.ToString();

    // ========================================================================
    // Factory methods
    // ========================================================================

    public static DocEntry Note(string text)
    {
        var entry = new DocEntry();
        entry.Set("kind", "note");
        entry.Set("text", text);
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Tag(params string[] names)
    {
        var entry = new DocEntry();
        entry.Set("kind", "tag");
        entry.Set("names", names.ToList());
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Kv(string label, object value)
    {
        var entry = new DocEntry();
        entry.Set("kind", "kv");
        entry.Set("label", label);
        entry.Set("value", value);
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Code(string label, string content, string? lang = null)
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
        return entry;
    }

    public static DocEntry Json(string label, object value)
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
                content = JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true });
            }
            catch
            {
                content = value?.ToString() ?? "";
            }
        }
        return Code(label, content, "json");
    }

    public static DocEntry Table(string label, string[] columns, string[][] rows)
    {
        var entry = new DocEntry();
        entry.Set("kind", "table");
        entry.Set("label", label);
        entry.Set("columns", columns.ToList());
        entry.Set("rows", rows.Select(r => r.ToList()).ToList());
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Link(string label, string url)
    {
        var entry = new DocEntry();
        entry.Set("kind", "link");
        entry.Set("label", label);
        entry.Set("url", url);
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Section(string title, string markdown)
    {
        var entry = new DocEntry();
        entry.Set("kind", "section");
        entry.Set("title", title);
        entry.Set("markdown", markdown);
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Mermaid(string code, string? title = null)
    {
        var entry = new DocEntry();
        entry.Set("kind", "mermaid");
        entry.Set("code", code);
        if (title != null)
        {
            entry.Set("title", title);
        }
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Screenshot(string path, string? alt = null)
    {
        var entry = new DocEntry();
        entry.Set("kind", "screenshot");
        entry.Set("path", path);
        if (alt != null)
        {
            entry.Set("alt", alt);
        }
        entry.Set("phase", "runtime");
        return entry;
    }

    public static DocEntry Custom(string type, object data)
    {
        var entry = new DocEntry();
        entry.Set("kind", "custom");
        entry.Set("type", type);
        entry.Set("data", data);
        entry.Set("phase", "runtime");
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
            throw new JsonException();

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndObject)
                return entry;

            if (reader.TokenType != JsonTokenType.PropertyName)
                throw new JsonException();

            var propertyName = reader.GetString()!;
            reader.Read();

            object? value = reader.TokenType switch
            {
                JsonTokenType.String => reader.GetString(),
                JsonTokenType.Number => reader.TryGetInt64(out var l) ? l : reader.GetDouble(),
                JsonTokenType.True => true,
                JsonTokenType.False => false,
                JsonTokenType.Null => null,
                _ => JsonSerializer.Deserialize<object>(ref reader, options)
            };

            entry.Set(propertyName, value);
        }

        throw new JsonException();
    }

    public override void Write(Utf8JsonWriter writer, DocEntry value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        foreach (var kvp in value.Fields)
        {
            if (kvp.Value is null)
                continue;

            writer.WritePropertyName(kvp.Key);
            JsonSerializer.Serialize(writer, kvp.Value, kvp.Value.GetType(), options);
        }
        writer.WriteEndObject();
    }
}
