using System.Security.Claims; // Claims
using System.Text; // Encoding
using Microsoft.AspNetCore.Authentication.JwtBearer; // JWT authentication
using Microsoft.IdentityModel.Tokens; // JWT token validation
using Npgsql; // PostgreSQL database connection

// Startup sequence (as you grow the project):
// 1) First pass — blank / minimal host: create the builder, load config, register controllers, API explorer, Swagger, and the database connection. No auth yet.
// 2) Second pass — add on: read JWT settings, call AddAuthentication/AddJwtBearer/AddAuthorization, then later UseAuthentication/UseAuthorization in the pipeline.
// 3) Optional cross-cutting: CORS when you need the frontend origin(s).
// Helper methods (LoadDotEnv, DecodeEscapedNewLines) are defined at the bottom but run when called — LoadDotEnv runs with step 1 when wiring configuration.

var builder = WebApplication.CreateBuilder(args); // Web application builder (runs first: entry point for service registration)

// --- Configuration (step 1 in the “no authentication yet” flow) ---
LoadDotEnv(Path.Combine(builder.Environment.ContentRootPath, ".env")); // Load environment variables from .env file 
builder.Configuration.AddEnvironmentVariables(); // Add environment variables to the configuration

// --- Core API shell: controllers, OpenAPI, database (still step 1: works without auth) ---
builder.Services.AddControllers(); // Add controllers to the services   
builder.Services.AddEndpointsApiExplorer(); // Add endpoints to the API explorer
builder.Services.AddSwaggerGen(); // Add Swagger to the services
var defaultConnection = builder.Configuration.GetConnectionString("Default"); // Get the default connection string from the configuration
if (string.IsNullOrWhiteSpace(defaultConnection)) // If the default connection string is empty
{
    throw new InvalidOperationException("ConnectionStrings__Default must be configured."); // Throw an exception if the default connection string is not configured
}
builder.Services.AddSingleton(new NpgsqlDataSourceBuilder(defaultConnection).Build()); // Add the PostgreSQL data source builder to the services

// --- Authentication and authorization (step 2: add after the API + DB are in place) ---
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? string.Empty; // Get the JWT secret from the configuration
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException("JWT_SECRET must be configured and at least 32 characters."); // Throw an exception if the JWT secret is not configured or is less than 32 characters
}

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)); // Create a symmetric security key from the JWT secret
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme) // Add JWT authentication to the services
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters // Create a token validation parameters object
        {
            ValidateIssuer = true, // Validate the issuer
            ValidateAudience = true, // Validate the audience
            ValidateIssuerSigningKey = true, // Validate the issuer signing key
            ValidateLifetime = true, // Validate the lifetime
            ValidIssuer = builder.Configuration["JWT_ISSUER"] ?? "multi-store-ecommerce-platform-api", // Validate the issuer
            ValidAudience = builder.Configuration["JWT_AUDIENCE"] ?? "multi-store-ecommerce-platform-client", // Validate the audience
            IssuerSigningKey = signingKey // Validate the issuer signing key
        };

        options.Events = new JwtBearerEvents // Create a JWT bearer events object
        {
            OnMessageReceived = context => // On message received event
            {
                if (string.IsNullOrWhiteSpace(context.Token)) // If the token is empty
                {
                    context.Token = context.Request.Cookies["access_token"]; // Set the token to the access token
                }
                return Task.CompletedTask; // Return a completed task
            }
        };
    });
builder.Services.AddAuthorization(); // Add authorization to the services

// --- CORS (optional; often added once you have a browser client — can be after or alongside auth, depending on your rollout) ---
var allowedOrigins = builder.Configuration["CORS_ALLOWED_ORIGINS"]; // Get the allowed origins from the configuration
if (!string.IsNullOrWhiteSpace(allowedOrigins)) // If the allowed origins is not empty
{
    var origins = allowedOrigins // Split the allowed origins by commas
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    builder.Services.AddCors(options => // Add CORS to the services
    {
        options.AddPolicy("FrontendPolicy", policy => // Add a policy to the CORS   
        {
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials(); // Allow any header, method, and credentials
        });
    });
}

// --- Build app and request pipeline (order matters: develop docs → CORS → then auth, then endpoints) ---
var app = builder.Build(); // Build the application (service registration is complete; from here the pipeline runs in order)

if (app.Environment.IsDevelopment()) // If the environment is development
{
    app.UseSwagger(); // Use Swagger
    app.UseSwaggerUI(); // Use Swagger UI
}

if (!string.IsNullOrWhiteSpace(allowedOrigins)) // If the allowed origins is not empty
{
    app.UseCors("FrontendPolicy"); // Use the CORS policy
}

// Auth middleware — part of step 2 in the “add authentication” pass; after CORS when credentials/cookies are involved
app.UseAuthentication(); // Use authentication
app.UseAuthorization(); // Use authorization

if (!app.Environment.IsDevelopment()) // If the environment is not development
{
    app.UseHttpsRedirection(); // Use HTTPS redirection
}
app.MapControllers(); // Map the controllers    

app.Run(); // Run the application (starts listening; blocks until shutdown)
// --- Helpers: not first in file order, but run when called from above (e.g. LoadDotEnv with configuration) ---
static void LoadDotEnv(string filePath) // Load the environment variables from the .env file
{
    if (!File.Exists(filePath)) // If the file does not exist
    {
        return; // Return if the file does not exist
    }

    foreach (var rawLine in File.ReadAllLines(filePath)) // Read the lines from the file
    {
        var line = rawLine.Trim(); // Trim the line
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#')) // If the line is empty or starts with a #
        {
            continue; // Continue if the line is empty or starts with a #
        }

        var separatorIndex = line.IndexOf('='); // Get the separator index
        if (separatorIndex <= 0)
        {
            continue; // Continue if the separator index is less than or equal to 0
        }

        var key = line[..separatorIndex].Trim(); // Get the key
        var value = line[(separatorIndex + 1)..].Trim().Trim('"'); // Get the value
        if (string.IsNullOrWhiteSpace(key)) // If the key is empty  
        {
            continue; // Continue if the key is empty
        }

        Environment.SetEnvironmentVariable(key, DecodeEscapedNewLines(value)); // Set the environment variable
    }
}

static string DecodeEscapedNewLines(string value) // Decode the escaped new lines
{
    return value.Replace("\\n", "\n", StringComparison.Ordinal); // Replace the escaped new lines with the new lines        
}
