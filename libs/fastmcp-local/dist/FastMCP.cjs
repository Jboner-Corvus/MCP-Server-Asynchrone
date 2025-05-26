"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/FastMCP.ts
var _indexjs = require('@modelcontextprotocol/sdk/server/index.js');
var _stdiojs = require('@modelcontextprotocol/sdk/server/stdio.js');













var _typesjs = require('@modelcontextprotocol/sdk/types.js');
var _crypto = require('crypto');
var _events = require('events');
var _filetype = require('file-type');
var _promises = require('fs/promises');
var _fusejs = require('fuse.js'); var _fusejs2 = _interopRequireDefault(_fusejs);
var _mcpproxy = require('mcp-proxy');
var _promises3 = require('timers/promises');
var _undici = require('undici');
var _uritemplates = require('uri-templates'); var _uritemplates2 = _interopRequireDefault(_uritemplates);
var _xsschema = require('xsschema');
var _zod = require('zod');
var imageContent = async (input) => {
  let rawData;
  try {
    if ("url" in input) {
      try {
        const response = await _undici.fetch.call(void 0, input.url);
        if (!response.ok) {
          throw new Error(
            `Server responded with status: ${response.status} - ${response.statusText}`
          );
        }
        rawData = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        throw new Error(
          `Failed to fetch image from URL (${input.url}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else if ("path" in input) {
      try {
        rawData = await _promises.readFile.call(void 0, input.path);
      } catch (error) {
        throw new Error(
          `Failed to read image from path (${input.path}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else if ("buffer" in input) {
      rawData = input.buffer;
    } else {
      throw new Error(
        "Invalid input: Provide a valid 'url', 'path', or 'buffer'"
      );
    }
    const mimeType = await _filetype.fileTypeFromBuffer.call(void 0, rawData);
    if (!mimeType || !mimeType.mime.startsWith("image/")) {
      console.warn(
        `Warning: Content may not be a valid image. Detected MIME: ${_optionalChain([mimeType, 'optionalAccess', _2 => _2.mime]) || "unknown"}`
      );
    }
    const base64Data = rawData.toString("base64");
    return {
      data: base64Data,
      mimeType: _nullishCoalesce(_optionalChain([mimeType, 'optionalAccess', _3 => _3.mime]), () => ( "image/png")),
      type: "image"
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unexpected error processing image: ${String(error)}`);
    }
  }
};
var audioContent = async (input) => {
  let rawData;
  try {
    if ("url" in input) {
      try {
        const response = await _undici.fetch.call(void 0, input.url);
        if (!response.ok) {
          throw new Error(
            `Server responded with status: ${response.status} - ${response.statusText}`
          );
        }
        rawData = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        throw new Error(
          `Failed to fetch audio from URL (${input.url}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else if ("path" in input) {
      try {
        rawData = await _promises.readFile.call(void 0, input.path);
      } catch (error) {
        throw new Error(
          `Failed to read audio from path (${input.path}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else if ("buffer" in input) {
      rawData = input.buffer;
    } else {
      throw new Error(
        "Invalid input: Provide a valid 'url', 'path', or 'buffer'"
      );
    }
    const mimeType = await _filetype.fileTypeFromBuffer.call(void 0, rawData);
    if (!mimeType || !mimeType.mime.startsWith("audio/")) {
      console.warn(
        `Warning: Content may not be a valid audio file. Detected MIME: ${_optionalChain([mimeType, 'optionalAccess', _4 => _4.mime]) || "unknown"}`
      );
    }
    const base64Data = rawData.toString("base64");
    return {
      data: base64Data,
      mimeType: _nullishCoalesce(_optionalChain([mimeType, 'optionalAccess', _5 => _5.mime]), () => ( "audio/mpeg")),
      type: "audio"
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unexpected error processing audio: ${String(error)}`);
    }
  }
};
var FastMCPError = class extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
};
var UnexpectedStateError = class extends FastMCPError {
  
  constructor(message, extras) {
    super(message);
    this.name = new.target.name;
    this.extras = extras;
  }
};
var UserError = class extends UnexpectedStateError {
};
var TextContentZodSchema = _zod.z.object({
  /**
   * The text content of the message.
   */
  text: _zod.z.string(),
  type: _zod.z.literal("text")
}).strict();
var ImageContentZodSchema = _zod.z.object({
  /**
   * The base64-encoded image data.
   */
  data: _zod.z.string().base64(),
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: _zod.z.string(),
  type: _zod.z.literal("image")
}).strict();
var AudioContentZodSchema = _zod.z.object({
  /**
   * The base64-encoded audio data.
   */
  data: _zod.z.string().base64(),
  mimeType: _zod.z.string(),
  type: _zod.z.literal("audio")
}).strict();
var ContentZodSchema = _zod.z.discriminatedUnion("type", [
  TextContentZodSchema,
  ImageContentZodSchema,
  AudioContentZodSchema
]);
var ContentResultZodSchema = _zod.z.object({
  content: ContentZodSchema.array(),
  isError: _zod.z.boolean().optional()
}).strict();
var CompletionZodSchema = _zod.z.object({
  /**
   * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
   */
  hasMore: _zod.z.optional(_zod.z.boolean()),
  /**
   * The total number of completion options available. This can exceed the number of values actually sent in the response.
   */
  total: _zod.z.optional(_zod.z.number().int()),
  /**
   * An array of completion values. Must not exceed 100 items.
   */
  values: _zod.z.array(_zod.z.string()).max(100)
});
var FastMCPSessionEventEmitterBase = _events.EventEmitter;
var FastMCPSessionEventEmitter = class extends FastMCPSessionEventEmitterBase {
};
var FastMCPSession = class extends FastMCPSessionEventEmitter {
  
  // Unique ID for this FastMCP session instance
  get clientCapabilities() {
    return _nullishCoalesce(this.#clientCapabilities, () => ( null));
  }
  get loggingLevel() {
    return this.#loggingLevel;
  }
  get roots() {
    return this.#roots;
  }
  get server() {
    return this.#server;
  }
  #auth;
  #capabilities = {};
  #clientCapabilities;
  #loggingLevel = "info";
  #pingConfig;
  #pingInterval = null;
  #prompts = [];
  #resources = [];
  #resourceTemplates = [];
  #roots = [];
  #rootsConfig;
  #server;
  constructor({
    auth,
    instructions,
    name,
    ping,
    prompts,
    resources,
    resourcesTemplates,
    roots,
    tools,
    version
  }) {
    super();
    this.frameworkSessionId = _crypto.randomUUID.call(void 0, );
    this.#auth = auth;
    this.#pingConfig = ping;
    this.#rootsConfig = roots;
    if (tools.length) {
      this.#capabilities.tools = {};
    }
    if (resources.length || resourcesTemplates.length) {
      this.#capabilities.resources = {};
    }
    if (prompts.length) {
      for (const prompt of prompts) {
        this.addPrompt(prompt);
      }
      this.#capabilities.prompts = {};
    }
    this.#capabilities.logging = {};
    this.#server = new (0, _indexjs.Server)(
      { name, version },
      { capabilities: this.#capabilities, instructions }
    );
    this.setupErrorHandling();
    this.setupLoggingHandlers();
    this.setupRootsHandlers();
    this.setupCompleteHandlers();
    if (tools.length) {
      this.setupToolHandlers(tools);
    }
    if (resources.length || resourcesTemplates.length) {
      for (const resource of resources) {
        this.addResource(resource);
      }
      this.setupResourceHandlers(resources);
      if (resourcesTemplates.length) {
        for (const resourceTemplate of resourcesTemplates) {
          this.addResourceTemplate(resourceTemplate);
        }
        this.setupResourceTemplateHandlers(resourcesTemplates);
      }
    }
    if (prompts.length) {
      this.setupPromptHandlers(prompts);
    }
  }
  async close() {
    if (this.#pingInterval) {
      clearInterval(this.#pingInterval);
    }
    try {
      await this.#server.close();
    } catch (error) {
      console.error("[FastMCP error]", "could not close server", error);
    }
  }
  async connect(transport) {
    if (this.#server.transport) {
      throw new UnexpectedStateError("Server is already connected");
    }
    await this.#server.connect(transport);
    let attempt = 0;
    while (attempt++ < 10) {
      const capabilities = await this.#server.getClientCapabilities();
      if (capabilities) {
        this.#clientCapabilities = capabilities;
        break;
      }
      await _promises3.setTimeout.call(void 0, 100);
    }
    if (!this.#clientCapabilities) {
      console.warn("[FastMCP warning] could not infer client capabilities");
    }
    if (_optionalChain([this, 'access', _6 => _6.#clientCapabilities, 'optionalAccess', _7 => _7.roots, 'optionalAccess', _8 => _8.listChanged]) && typeof this.#server.listRoots === "function") {
      try {
        const roots = await this.#server.listRoots();
        this.#roots = roots.roots;
      } catch (e) {
        if (e instanceof _typesjs.McpError && e.code === _typesjs.ErrorCode.MethodNotFound) {
          console.debug(
            "[FastMCP debug] listRoots method not supported by client"
          );
        } else {
          console.error(
            `[FastMCP error] received error listing roots.

${e instanceof Error ? e.stack : JSON.stringify(e)}`
          );
        }
      }
    }
    if (this.#clientCapabilities) {
      const pingConfig = this.#getPingConfig(transport);
      if (pingConfig.enabled) {
        this.#pingInterval = setInterval(async () => {
          try {
            await this.#server.ping();
          } catch (e2) {
            const logLevel = pingConfig.logLevel;
            if (logLevel === "debug") {
              console.debug("[FastMCP debug] server ping failed");
            } else if (logLevel === "warning") {
              console.warn(
                "[FastMCP warning] server is not responding to ping"
              );
            } else if (logLevel === "error") {
              console.error("[FastMCP error] server is not responding to ping");
            } else {
              console.info("[FastMCP info] server ping failed");
            }
          }
        }, pingConfig.intervalMs);
      }
    }
  }
  async requestSampling(message) {
    return this.#server.createMessage(message);
  }
  #getPingConfig(transport) {
    const pingConfig = this.#pingConfig || {};
    let defaultEnabled = false;
    if ("type" in transport) {
      if (transport.type === "httpStream") {
        defaultEnabled = true;
      }
    }
    return {
      enabled: pingConfig.enabled !== void 0 ? pingConfig.enabled : defaultEnabled,
      intervalMs: pingConfig.intervalMs || 5e3,
      logLevel: pingConfig.logLevel || "debug"
    };
  }
  addPrompt(inputPrompt) {
    const completers = {};
    const enums = {};
    for (const argument of _nullishCoalesce(inputPrompt.arguments, () => ( []))) {
      if (argument.complete) {
        completers[argument.name] = argument.complete;
      }
      if (argument.enum) {
        enums[argument.name] = argument.enum;
      }
    }
    const prompt = {
      ...inputPrompt,
      complete: async (name, value) => {
        if (completers[name]) {
          return await completers[name](value);
        }
        if (enums[name]) {
          const fuse = new (0, _fusejs2.default)(enums[name], {
            keys: ["value"]
          });
          const result = fuse.search(value);
          return {
            total: result.length,
            values: result.map((item) => item.item)
          };
        }
        return {
          values: []
        };
      }
    };
    this.#prompts.push(prompt);
  }
  addResource(inputResource) {
    this.#resources.push(inputResource);
  }
  addResourceTemplate(inputResourceTemplate) {
    const completers = {};
    for (const argument of _nullishCoalesce(inputResourceTemplate.arguments, () => ( []))) {
      if (argument.complete) {
        completers[argument.name] = argument.complete;
      }
    }
    const resourceTemplate = {
      ...inputResourceTemplate,
      complete: async (name, value) => {
        if (completers[name]) {
          return await completers[name](value);
        }
        return {
          values: []
        };
      }
    };
    this.#resourceTemplates.push(resourceTemplate);
  }
  setupCompleteHandlers() {
    this.#server.setRequestHandler(_typesjs.CompleteRequestSchema, async (request) => {
      if (request.params.ref.type === "ref/prompt") {
        const prompt = this.#prompts.find(
          (prompt2) => prompt2.name === request.params.ref.name
        );
        if (!prompt) {
          throw new UnexpectedStateError("Unknown prompt", {
            request
          });
        }
        if (!prompt.complete) {
          throw new UnexpectedStateError("Prompt does not support completion", {
            request
          });
        }
        const completion = CompletionZodSchema.parse(
          await prompt.complete(
            request.params.argument.name,
            request.params.argument.value
          )
        );
        return {
          completion
        };
      }
      if (request.params.ref.type === "ref/resource") {
        const resource = this.#resourceTemplates.find(
          (resource2) => resource2.uriTemplate === request.params.ref.uri
        );
        if (!resource) {
          throw new UnexpectedStateError("Unknown resource", {
            request
          });
        }
        if (!("uriTemplate" in resource)) {
          throw new UnexpectedStateError("Unexpected resource");
        }
        if (!resource.complete) {
          throw new UnexpectedStateError(
            "Resource does not support completion",
            {
              request
            }
          );
        }
        const completion = CompletionZodSchema.parse(
          await resource.complete(
            request.params.argument.name,
            request.params.argument.value
          )
        );
        return {
          completion
        };
      }
      throw new UnexpectedStateError("Unexpected completion request", {
        request
      });
    });
  }
  setupErrorHandling() {
    this.#server.onerror = (error) => {
      console.error("[FastMCP error]", error);
    };
  }
  setupLoggingHandlers() {
    this.#server.setRequestHandler(_typesjs.SetLevelRequestSchema, (request) => {
      this.#loggingLevel = request.params.level;
      return {};
    });
  }
  setupPromptHandlers(prompts) {
    this.#server.setRequestHandler(_typesjs.ListPromptsRequestSchema, async () => {
      return {
        prompts: prompts.map((prompt) => {
          return {
            arguments: prompt.arguments,
            complete: prompt.complete,
            description: prompt.description,
            name: prompt.name
          };
        })
      };
    });
    this.#server.setRequestHandler(_typesjs.GetPromptRequestSchema, async (request) => {
      const prompt = prompts.find(
        (prompt2) => prompt2.name === request.params.name
      );
      if (!prompt) {
        throw new (0, _typesjs.McpError)(
          _typesjs.ErrorCode.MethodNotFound,
          `Unknown prompt: ${request.params.name}`
        );
      }
      const args = request.params.arguments;
      for (const arg of _nullishCoalesce(prompt.arguments, () => ( []))) {
        if (arg.required && !(args && arg.name in args)) {
          throw new (0, _typesjs.McpError)(
            _typesjs.ErrorCode.InvalidRequest,
            `Missing required argument: ${arg.name}`
          );
        }
      }
      let result;
      try {
        result = await prompt.load(args);
      } catch (error) {
        throw new (0, _typesjs.McpError)(
          _typesjs.ErrorCode.InternalError,
          `Error loading prompt: ${error}`
        );
      }
      return {
        description: prompt.description,
        messages: [
          {
            content: { text: result, type: "text" },
            role: "user"
          }
        ]
      };
    });
  }
  setupResourceHandlers(resources) {
    this.#server.setRequestHandler(_typesjs.ListResourcesRequestSchema, async () => {
      return {
        resources: resources.map((resource) => {
          return {
            mimeType: resource.mimeType,
            name: resource.name,
            uri: resource.uri
          };
        })
      };
    });
    this.#server.setRequestHandler(
      _typesjs.ReadResourceRequestSchema,
      async (request) => {
        if ("uri" in request.params) {
          const resource = resources.find(
            (resource2) => "uri" in resource2 && resource2.uri === request.params.uri
          );
          if (!resource) {
            for (const resourceTemplate of this.#resourceTemplates) {
              const uriTemplate = _uritemplates2.default.call(void 0, 
                resourceTemplate.uriTemplate
              );
              const match = uriTemplate.fromUri(request.params.uri);
              if (!match) {
                continue;
              }
              const uri = uriTemplate.fill(match);
              const result = await resourceTemplate.load(match);
              return {
                contents: [
                  {
                    mimeType: resourceTemplate.mimeType,
                    name: resourceTemplate.name,
                    uri,
                    ...result
                  }
                ]
              };
            }
            throw new (0, _typesjs.McpError)(
              _typesjs.ErrorCode.MethodNotFound,
              `Unknown resource: ${request.params.uri}`
            );
          }
          if (!("uri" in resource)) {
            throw new UnexpectedStateError("Resource does not support reading");
          }
          let maybeArrayResult;
          try {
            maybeArrayResult = await resource.load();
          } catch (error) {
            throw new (0, _typesjs.McpError)(
              _typesjs.ErrorCode.InternalError,
              `Error reading resource: ${error}`,
              {
                uri: resource.uri
              }
            );
          }
          if (Array.isArray(maybeArrayResult)) {
            return {
              contents: maybeArrayResult.map((result) => ({
                mimeType: resource.mimeType,
                name: resource.name,
                uri: resource.uri,
                ...result
              }))
            };
          } else {
            return {
              contents: [
                {
                  mimeType: resource.mimeType,
                  name: resource.name,
                  uri: resource.uri,
                  ...maybeArrayResult
                }
              ]
            };
          }
        }
        throw new UnexpectedStateError("Unknown resource request", {
          request
        });
      }
    );
  }
  setupResourceTemplateHandlers(resourceTemplates) {
    this.#server.setRequestHandler(
      _typesjs.ListResourceTemplatesRequestSchema,
      async () => {
        return {
          resourceTemplates: resourceTemplates.map((resourceTemplate) => {
            return {
              name: resourceTemplate.name,
              uriTemplate: resourceTemplate.uriTemplate
            };
          })
        };
      }
    );
  }
  setupRootsHandlers() {
    if (_optionalChain([this, 'access', _9 => _9.#rootsConfig, 'optionalAccess', _10 => _10.enabled]) === false) {
      console.debug(
        "[FastMCP debug] roots capability explicitly disabled via config"
      );
      return;
    }
    if (typeof this.#server.listRoots === "function") {
      this.#server.setNotificationHandler(
        _typesjs.RootsListChangedNotificationSchema,
        () => {
          this.#server.listRoots().then((roots) => {
            this.#roots = roots.roots;
            this.emit("rootsChanged", {
              roots: roots.roots
            });
          }).catch((error) => {
            if (error instanceof _typesjs.McpError && error.code === _typesjs.ErrorCode.MethodNotFound) {
              console.debug(
                "[FastMCP debug] listRoots method not supported by client"
              );
            } else {
              console.error("[FastMCP error] Error listing roots", error);
            }
          });
        }
      );
    } else {
      console.debug(
        "[FastMCP debug] roots capability not available, not setting up notification handler"
      );
    }
  }
  setupToolHandlers(tools) {
    this.#server.setRequestHandler(_typesjs.ListToolsRequestSchema, async () => {
      return {
        tools: await Promise.all(
          tools.map(async (tool) => {
            return {
              annotations: tool.annotations,
              description: tool.description,
              inputSchema: tool.parameters ? await _xsschema.toJsonSchema.call(void 0, tool.parameters) : {
                additionalProperties: false,
                properties: {},
                type: "object"
              },
              // More complete schema for Cursor compatibility
              name: tool.name
            };
          })
        )
      };
    });
    this.#server.setRequestHandler(_typesjs.CallToolRequestSchema, async (request) => {
      const tool = tools.find((tool2) => tool2.name === request.params.name);
      if (!tool) {
        throw new (0, _typesjs.McpError)(
          _typesjs.ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
      let args = void 0;
      if (tool.parameters) {
        const parsed = await tool.parameters["~standard"].validate(
          request.params.arguments
        );
        if (parsed.issues) {
          throw new (0, _typesjs.McpError)(
            _typesjs.ErrorCode.InvalidParams,
            `Invalid ${request.params.name} parameters: ${JSON.stringify(parsed.issues)}`
          );
        }
        args = parsed.value;
      }
      const progressToken = _optionalChain([request, 'access', _11 => _11.params, 'optionalAccess', _12 => _12._meta, 'optionalAccess', _13 => _13.progressToken]);
      let result;
      try {
        const reportProgress = async (progress) => {
          await this.#server.notification({
            method: "notifications/progress",
            params: {
              ...progress,
              progressToken
            }
          });
        };
        const log = {
          debug: (message, context) => {
            this.#server.sendLoggingMessage({
              data: {
                context,
                message
              },
              level: "debug"
            });
          },
          error: (message, context) => {
            this.#server.sendLoggingMessage({
              data: {
                context,
                message
              },
              level: "error"
            });
          },
          info: (message, context) => {
            this.#server.sendLoggingMessage({
              data: {
                context,
                message
              },
              level: "info"
            });
          },
          warn: (message, context) => {
            this.#server.sendLoggingMessage({
              data: {
                context,
                message
              },
              level: "warning"
            });
          }
        };
        const streamContent = async (content) => {
          const contentArray = Array.isArray(content) ? content : [content];
          await this.#server.notification({
            method: "notifications/tool/streamContent",
            params: {
              content: contentArray,
              toolName: request.params.name
            }
          });
        };
        const toolContext = {
          authData: this.#auth,
          frameworkSessionId: this.frameworkSessionId,
          log,
          reportProgress,
          streamContent
        };
        const executeToolPromise = tool.execute(args, toolContext);
        const maybeStringResult = await (tool.timeoutMs ? Promise.race([
          executeToolPromise,
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(
                new UserError(
                  `Tool execution timed out after ${tool.timeoutMs}ms`
                )
              );
            }, tool.timeoutMs);
          })
        ]) : executeToolPromise);
        if (maybeStringResult === void 0 || maybeStringResult === null) {
          result = ContentResultZodSchema.parse({
            content: []
          });
        } else if (typeof maybeStringResult === "string") {
          result = ContentResultZodSchema.parse({
            content: [{ text: maybeStringResult, type: "text" }]
          });
        } else if ("type" in maybeStringResult) {
          result = ContentResultZodSchema.parse({
            content: [maybeStringResult]
          });
        } else {
          result = ContentResultZodSchema.parse(maybeStringResult);
        }
      } catch (error) {
        if (error instanceof UserError) {
          return {
            content: [{ text: error.message, type: "text" }],
            isError: true
          };
        }
        return {
          content: [{ text: `Error: ${error}`, type: "text" }],
          isError: true
        };
      }
      return result;
    });
  }
};
var FastMCPEventEmitterBase = _events.EventEmitter;
var FastMCPEventEmitter = class extends FastMCPEventEmitterBase {
};
var FastMCP = class extends FastMCPEventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.#options = options;
    this.#authenticate = options.authenticate;
  }
  get sessions() {
    return this.#sessions;
  }
  #authenticate;
  #httpStreamServer = null;
  #options;
  #prompts = [];
  #resources = [];
  #resourcesTemplates = [];
  #sessions = [];
  #tools = [];
  /**
   * Adds a prompt to the server.
   */
  addPrompt(prompt) {
    this.#prompts.push(prompt);
  }
  /**
   * Adds a resource to the server.
   */
  addResource(resource) {
    this.#resources.push(resource);
  }
  /**
   * Adds a resource template to the server.
   */
  addResourceTemplate(resource) {
    this.#resourcesTemplates.push(resource);
  }
  /**
   * Adds a tool to the server.
   */
  addTool(tool) {
    this.#tools.push(tool);
  }
  /**
   * Starts the server.
   */
  async start(options = {
    transportType: "stdio"
  }) {
    if (options.transportType === "stdio") {
      const transport = new (0, _stdiojs.StdioServerTransport)();
      const session = new FastMCPSession({
        instructions: this.#options.instructions,
        name: this.#options.name,
        ping: this.#options.ping,
        prompts: this.#prompts,
        resources: this.#resources,
        resourcesTemplates: this.#resourcesTemplates,
        roots: this.#options.roots,
        tools: this.#tools,
        version: this.#options.version
      });
      await session.connect(transport);
      this.#sessions.push(session);
      this.emit("connect", {
        session
      });
    } else if (options.transportType === "httpStream") {
      this.#httpStreamServer = await _mcpproxy.startHTTPServer.call(void 0, {
        createServer: async (request) => {
          let auth;
          if (this.#authenticate) {
            auth = await this.#authenticate(request);
          }
          return new FastMCPSession({
            auth,
            instructions: this.#options.instructions,
            name: this.#options.name,
            ping: this.#options.ping,
            prompts: this.#prompts,
            resources: this.#resources,
            resourcesTemplates: this.#resourcesTemplates,
            roots: this.#options.roots,
            tools: this.#tools,
            version: this.#options.version
          });
        },
        onClose: (session) => {
          this.emit("disconnect", {
            session
          });
        },
        onConnect: async (session) => {
          this.#sessions.push(session);
          this.emit("connect", {
            session
          });
        },
        onUnhandledRequest: async (req, res) => {
          const healthConfig = _nullishCoalesce(this.#options.health, () => ( {}));
          const enabled = healthConfig.enabled === void 0 ? true : healthConfig.enabled;
          if (enabled) {
            const path = _nullishCoalesce(healthConfig.path, () => ( "/health"));
            try {
              if (req.method === "GET" && new URL(req.url || "", "http://localhost").pathname === path) {
                res.writeHead(_nullishCoalesce(healthConfig.status, () => ( 200)), {
                  "Content-Type": "text/plain"
                }).end(_nullishCoalesce(healthConfig.message, () => ( "ok")));
                return;
              }
            } catch (error) {
              console.error("[FastMCP error] health endpoint error", error);
            }
          }
          res.writeHead(404).end();
        },
        port: options.httpStream.port
      });
      console.info(
        `[FastMCP info] server is running on HTTP Stream at http://localhost:${options.httpStream.port}/stream`
      );
    } else {
      throw new Error("Invalid transport type");
    }
  }
  /**
   * Stops the server.
   */
  async stop() {
    if (this.#httpStreamServer) {
      await this.#httpStreamServer.close();
    }
  }
};







exports.FastMCP = FastMCP; exports.FastMCPSession = FastMCPSession; exports.UnexpectedStateError = UnexpectedStateError; exports.UserError = UserError; exports.audioContent = audioContent; exports.imageContent = imageContent;
//# sourceMappingURL=FastMCP.cjs.map