/**
 * Minimal `document.modelContext` typing for the page-side code in these tests.
 *
 * Not a spec transcription: only what the fixture and specs actually touch,
 * shaped the way Chrome 152 behaves — note `inputSchema` is a JSON *string*,
 * and `executeTool` takes one too.
 */
interface WebMcpToolDescriptor {
  name: string;
  description: string;
  inputSchema: string;
  title?: string;
  annotations?: Record<string, boolean>;
}

interface WebMcpModelContext {
  getTools(): Promise<WebMcpToolDescriptor[]>;
  executeTool(tool: { name: string }, inputArguments: string): Promise<string>;
}

interface Document {
  modelContext?: WebMcpModelContext;
}
