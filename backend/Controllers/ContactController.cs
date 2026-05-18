using backend.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly AzureCommunicationEmailService _emailService;
    private readonly AzureCommunicationEmailOptions _emailOptions;

    public ContactController(
        AzureCommunicationEmailService emailService,
        IOptions<AzureCommunicationEmailOptions> emailOptions)
    {
        _emailService = emailService;
        _emailOptions = emailOptions.Value;
    }

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] ContactFormRequest request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim() ?? string.Empty;
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var phone = request.Phone?.Trim();
        var subject = request.Subject?.Trim() ?? string.Empty;
        var message = request.Message?.Trim() ?? string.Empty;

        var errors = new Dictionary<string, string>();

        if (name.Length < 2)
        {
            errors["name"] = "Please enter at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            errors["email"] = "Please enter a valid email address.";
        }

        if (!string.IsNullOrWhiteSpace(phone) && phone.Length < 8)
        {
            errors["phone"] = "If provided, use at least 8 characters.";
        }

        if (subject.Length < 3)
        {
            errors["subject"] = "Add a short subject (at least 3 characters).";
        }

        if (message.Length < 20)
        {
            errors["message"] = "Please write at least 20 characters so we can help.";
        }
        else if (message.Length > 4000)
        {
            errors["message"] = "Message is too long (max 4000 characters).";
        }

        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors });
        }

        if (!_emailService.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Contact email is not configured. Set ACS_EMAIL_ENABLED=true and Azure Communication Services settings in backend/.env."
            });
        }

        var inbox = _emailOptions.ContactFormToEmail.Trim();
        if (string.IsNullOrWhiteSpace(inbox) || !inbox.Contains('@'))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "CONTACT_FORM_TO_EMAIL is not configured. Set your inbox address in backend/.env."
            });
        }

        try
        {
            await _emailService.SendContactFormEmailAsync(
                name,
                email,
                phone,
                subject,
                message,
                cancellationToken);

            return Ok(new { message = "Your message has been sent." });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = "Unable to send your message right now. Please try again later."
            });
        }
    }
}

public sealed record ContactFormRequest(
    string? Name,
    string? Email,
    string? Phone,
    string? Subject,
    string? Message);
