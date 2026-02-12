namespace ExecutableStories.Xunit;

/// <summary>
/// Detects common CI environments and returns metadata about the current build.
/// </summary>
internal static class CIDetector
{
    public static Dictionary<string, string>? Detect()
    {
        if (Environment.GetEnvironmentVariable("GITHUB_ACTIONS") == "true")
        {
            var ci = new Dictionary<string, string> { ["name"] = "github" };
            var buildNum = Environment.GetEnvironmentVariable("GITHUB_RUN_NUMBER");
            if (buildNum != null) ci["buildNumber"] = buildNum;
            var server = Environment.GetEnvironmentVariable("GITHUB_SERVER_URL");
            var repo = Environment.GetEnvironmentVariable("GITHUB_REPOSITORY");
            var runId = Environment.GetEnvironmentVariable("GITHUB_RUN_ID");
            if (server != null && repo != null && runId != null)
                ci["url"] = $"{server}/{repo}/actions/runs/{runId}";
            return ci;
        }
        if (Environment.GetEnvironmentVariable("CIRCLECI") == "true")
        {
            var ci = new Dictionary<string, string> { ["name"] = "circleci" };
            var buildNum = Environment.GetEnvironmentVariable("CIRCLE_BUILD_NUM");
            if (buildNum != null) ci["buildNumber"] = buildNum;
            var url = Environment.GetEnvironmentVariable("CIRCLE_BUILD_URL");
            if (url != null) ci["url"] = url;
            return ci;
        }
        if (Environment.GetEnvironmentVariable("JENKINS_URL") != null)
        {
            var ci = new Dictionary<string, string> { ["name"] = "jenkins" };
            var buildNum = Environment.GetEnvironmentVariable("BUILD_NUMBER");
            if (buildNum != null) ci["buildNumber"] = buildNum;
            var url = Environment.GetEnvironmentVariable("BUILD_URL");
            if (url != null) ci["url"] = url;
            return ci;
        }
        if (Environment.GetEnvironmentVariable("TRAVIS") == "true")
        {
            var ci = new Dictionary<string, string> { ["name"] = "travis" };
            var buildNum = Environment.GetEnvironmentVariable("TRAVIS_BUILD_NUMBER");
            if (buildNum != null) ci["buildNumber"] = buildNum;
            var url = Environment.GetEnvironmentVariable("TRAVIS_BUILD_WEB_URL");
            if (url != null) ci["url"] = url;
            return ci;
        }
        if (Environment.GetEnvironmentVariable("GITLAB_CI") == "true")
        {
            var ci = new Dictionary<string, string> { ["name"] = "gitlab" };
            var buildNum = Environment.GetEnvironmentVariable("CI_PIPELINE_IID");
            if (buildNum != null) ci["buildNumber"] = buildNum;
            var url = Environment.GetEnvironmentVariable("CI_PIPELINE_URL");
            if (url != null) ci["url"] = url;
            return ci;
        }
        if (Environment.GetEnvironmentVariable("CI") == "true")
        {
            return new Dictionary<string, string> { ["name"] = "ci" };
        }
        return null;
    }

    /// <summary>
    /// Convert a CI detection dictionary to a <see cref="RawCIInfo"/> POCO.
    /// </summary>
    public static RawCIInfo? ToRawCIInfo(Dictionary<string, string>? dict)
    {
        if (dict == null) return null;
        var info = new RawCIInfo { Name = dict["name"] };
        if (dict.TryGetValue("buildNumber", out var buildNum)) info.BuildNumber = buildNum;
        if (dict.TryGetValue("url", out var url)) info.Url = url;
        return info;
    }
}
