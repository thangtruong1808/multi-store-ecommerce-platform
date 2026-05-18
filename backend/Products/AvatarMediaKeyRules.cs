using System.Text.RegularExpressions;

namespace backend.Products;

public static partial class AvatarMediaKeyRules
{
    private const string AvatarsPrefix = "avatars/";

    public static string BuildUserAvatarKey(Guid userId) =>
        $"{AvatarsPrefix}{userId:D}/{Guid.NewGuid():N}.webp";

    public static bool IsUnderAvatarsPrefix(string blobKey) =>
        blobKey.StartsWith(AvatarsPrefix, StringComparison.OrdinalIgnoreCase);

    public static bool IsAvatarKeyForUser(string blobKey, Guid userId) =>
        blobKey.StartsWith($"{AvatarsPrefix}{userId:D}/", StringComparison.OrdinalIgnoreCase);

    public static bool IsValidKeyFormat(string blobKey) =>
        AvatarBlobKeyFormatRegex().IsMatch(blobKey);

    public static bool CanUseOnProfileUpdate(string? blobKey, Guid userId)
    {
        var trimmed = blobKey?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return true;
        }

        return IsUnderAvatarsPrefix(trimmed)
               && IsAvatarKeyForUser(trimmed, userId)
               && IsValidKeyFormat(trimmed);
    }

    [GeneratedRegex(@"^avatars/[0-9a-fA-F\-]{36}/[0-9a-fA-F]{32}\.webp$", RegexOptions.CultureInvariant)]
    private static partial Regex AvatarBlobKeyFormatRegex();
}
