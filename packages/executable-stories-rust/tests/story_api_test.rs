use executable_stories::Story;

#[test]
fn test_story_new() {
    let mut s = Story::new("test scenario").with_tags(&["tag1"]);
    s.given("a precondition");
    s.when("an action");
    s.then("an outcome");
}

#[test]
fn test_story_with_and_but() {
    let mut s = Story::new("scenario with and/but");
    s.given("a precondition");
    s.and("another precondition");
    s.when("an action");
    s.then("an outcome");
    s.but("not this other outcome");
}

#[test]
fn test_story_with_tickets() {
    let mut s = Story::new("ticketed scenario")
        .with_tags(&["smoke"])
        .with_tickets(&["JIRA-123", "JIRA-456"]);
    s.given("a setup");
    s.when("something happens");
    s.then("it works");
}

#[test]
fn test_story_with_covers() {
    let mut s = Story::new("covered scenario").with_covers(&["src/auth/login.rs", "src/session.rs"]);
    s.given("a setup");
    s.when("something happens");
    s.then("it works");
}

#[test]
fn test_doc_methods() {
    let mut s = Story::new("test docs");
    s.given("something");
    s.note("a note");
}

#[test]
fn test_doc_methods_on_steps() {
    let mut s = Story::new("docs on steps");
    s.given("a user exists");
    s.kv("user_id", serde_json::json!(42));
    s.when("the user logs in");
    s.code("request", "POST /login", Some("http"));
    s.then("login succeeds");
    s.link("docs", "https://example.com/auth");
}

#[test]
fn test_story_level_docs() {
    let mut s = Story::new("story level docs");
    // Docs added before any step go to story-level
    s.note("this is a story-level note");
    s.given("something");
}

#[test]
fn test_explicit_fail() {
    // A test that fails without panicking (a `#[test] -> Result` returning Err)
    // has to say so; panicking assertions are detected on drop.
    let mut s = Story::new("failing scenario");
    s.given("a precondition");
    s.when("something goes wrong");
    s.fail();
    drop(s);
}
