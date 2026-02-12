use executable_stories::{DocEntry, RawRun, RawTestCase, StoryMeta, StoryStep};

#[test]
fn test_raw_run_serialization() {
    let run = RawRun {
        schema_version: 1,
        test_cases: vec![RawTestCase {
            status: "pass".to_string(),
            title: Some("example scenario".to_string()),
            story: Some(StoryMeta {
                scenario: "example scenario".to_string(),
                steps: vec![
                    StoryStep {
                        keyword: "Given".to_string(),
                        text: "a precondition".to_string(),
                        id: None,
                        mode: None,
                        wrapped: None,
                        duration_ms: None,
                        docs: None,
                    },
                    StoryStep {
                        keyword: "When".to_string(),
                        text: "an action".to_string(),
                        id: None,
                        mode: None,
                        wrapped: None,
                        duration_ms: None,
                        docs: None,
                    },
                    StoryStep {
                        keyword: "Then".to_string(),
                        text: "an outcome".to_string(),
                        id: None,
                        mode: None,
                        wrapped: None,
                        duration_ms: None,
                        docs: None,
                    },
                ],
                tags: Some(vec!["smoke".to_string()]),
                tickets: None,
                docs: None,
                source_order: Some(0),
            }),
            duration_ms: Some(42.5),
            ..Default::default()
        }],
        project_root: "/tmp/test-project".to_string(),
        started_at_ms: None,
        finished_at_ms: None,
        ci: None,
    };

    let json = serde_json::to_value(&run).unwrap();

    assert_eq!(json["schemaVersion"], 1);
    assert_eq!(json["projectRoot"], "/tmp/test-project");
    assert_eq!(json["testCases"].as_array().unwrap().len(), 1);

    let tc = &json["testCases"][0];
    assert_eq!(tc["status"], "pass");
    assert_eq!(tc["title"], "example scenario");
    assert_eq!(tc["durationMs"], 42.5);

    // externalId and error should be absent (skip_serializing_if)
    assert!(tc.get("externalId").is_none());
    assert!(tc.get("error").is_none());

    let story = &tc["story"];
    assert_eq!(story["scenario"], "example scenario");
    assert_eq!(story["steps"].as_array().unwrap().len(), 3);
    assert_eq!(story["steps"][0]["keyword"], "Given");
    assert_eq!(story["steps"][0]["text"], "a precondition");
    assert_eq!(story["tags"], serde_json::json!(["smoke"]));
    assert_eq!(story["sourceOrder"], 0);

    // tickets and docs should be absent
    assert!(story.get("tickets").is_none());
    assert!(story.get("docs").is_none());
}

#[test]
fn test_camel_case_field_names() {
    let run = RawRun {
        schema_version: 1,
        test_cases: vec![],
        project_root: "/tmp".to_string(),
        started_at_ms: Some(1000.0),
        finished_at_ms: Some(2000.0),
        ci: None,
    };

    let json_str = serde_json::to_string(&run).unwrap();

    // Verify camelCase (not snake_case)
    assert!(json_str.contains("schemaVersion"));
    assert!(!json_str.contains("schema_version"));
    assert!(json_str.contains("testCases"));
    assert!(!json_str.contains("test_cases"));
    assert!(json_str.contains("projectRoot"));
    assert!(!json_str.contains("project_root"));
    assert!(json_str.contains("startedAtMs"));
    assert!(!json_str.contains("started_at_ms"));
    assert!(json_str.contains("finishedAtMs"));
    assert!(!json_str.contains("finished_at_ms"));
}

#[test]
fn test_optional_fields_omitted_when_none() {
    let tc = RawTestCase {
        status: "pass".to_string(),
        ..Default::default()
    };

    let json = serde_json::to_value(&tc).unwrap();
    let obj = json.as_object().unwrap();

    // "status", "retry", and "retries" should be present (non-optional fields)
    assert_eq!(obj.len(), 3);
    assert!(obj.contains_key("status"));
    assert!(obj.contains_key("retry"));
    assert!(obj.contains_key("retries"));
}

#[test]
fn test_step_with_docs() {
    let step = StoryStep {
        keyword: "Given".to_string(),
        text: "a user".to_string(),
        id: None,
        mode: None,
        wrapped: None,
        duration_ms: None,
        docs: Some(vec![DocEntry::note("important detail")]),
    };

    let json = serde_json::to_value(&step).unwrap();
    assert_eq!(json["keyword"], "Given");
    assert_eq!(json["text"], "a user");
    assert!(json.get("mode").is_none());

    let docs = json["docs"].as_array().unwrap();
    assert_eq!(docs.len(), 1);
    assert_eq!(docs[0]["kind"], "note");
    assert_eq!(docs[0]["text"], "important detail");
    assert_eq!(docs[0]["phase"], "runtime");
}

#[test]
fn test_story_meta_with_docs() {
    let meta = StoryMeta {
        scenario: "documented scenario".to_string(),
        steps: vec![],
        tags: None,
        tickets: Some(vec!["TICKET-1".to_string()]),
        docs: Some(vec![
            DocEntry::note("overview note"),
            DocEntry::link("spec", "https://example.com/spec"),
        ]),
        source_order: Some(5),
    };

    let json = serde_json::to_value(&meta).unwrap();
    assert_eq!(json["scenario"], "documented scenario");
    assert_eq!(json["tickets"], serde_json::json!(["TICKET-1"]));
    assert_eq!(json["sourceOrder"], 5);

    let docs = json["docs"].as_array().unwrap();
    assert_eq!(docs.len(), 2);
    assert_eq!(docs[0]["kind"], "note");
    assert_eq!(docs[1]["kind"], "link");
}

#[test]
fn test_json_write_roundtrip() {
    let run = RawRun {
        schema_version: 1,
        test_cases: vec![RawTestCase {
            status: "pass".to_string(),
            title: Some("roundtrip test".to_string()),
            ..Default::default()
        }],
        project_root: "/tmp".to_string(),
        started_at_ms: None,
        finished_at_ms: None,
        ci: None,
    };

    let output_path = std::env::temp_dir()
        .join("executable-stories-test")
        .join("roundtrip.json");
    let output_str = output_path.to_string_lossy().to_string();

    executable_stories::write_raw_run_to_path(&run, &output_str).unwrap();

    let contents = std::fs::read_to_string(&output_path).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();

    assert_eq!(parsed["schemaVersion"], 1);
    assert_eq!(parsed["testCases"][0]["status"], "pass");
    assert_eq!(parsed["testCases"][0]["title"], "roundtrip test");

    // Cleanup
    let _ = std::fs::remove_dir_all(output_path.parent().unwrap());
}
