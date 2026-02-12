using Xunit;
using Xunit.Abstractions;

namespace ExecutableStories.Xunit;

/// <summary>
/// xUnit runner reporter that hooks into the test lifecycle to capture BDD story data.
/// Implements <see cref="IRunnerReporter"/> for automatic discovery by the xUnit runner.
/// </summary>
public class StoryReporter : IRunnerReporter
{
    /// <inheritdoc />
    public string Description => "Executable Stories reporter";

    /// <inheritdoc />
    public bool IsEnvironmentallyEnabled => true;

    /// <inheritdoc />
    public string RunnerSwitch => "executable-stories";

    /// <inheritdoc />
    public IMessageSink CreateMessageHandler(IRunnerLogger logger)
        => new StoryMessageSink();
}
