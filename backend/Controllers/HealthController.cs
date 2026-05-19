using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly IConfiguration _configuration;

    public HealthController(NpgsqlDataSource dataSource, IConfiguration configuration)
    {
        _dataSource = dataSource;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var maintenanceMode = bool.TryParse(_configuration["MAINTENANCE_MODE"], out var enabled) && enabled;
        if (maintenanceMode)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    status = "maintenance",
                    message = "We are currently under maintenance. Please come back later.",
                });
        }

        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1;";
            _ = await cmd.ExecuteScalarAsync(cancellationToken);

            return Ok(new { status = "ok", database = "ok" });
        }
        catch (Exception)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    status = "unavailable",
                    message = "We are having technical difficulties. Please try again in a few minutes.",
                });
        }
    }
}
