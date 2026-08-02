using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace Backend.Services;

public class ConfigService
{
    private readonly string _configFilePath;

    public ConfigService()
    {
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "data");
        if (!Directory.Exists(dataDir))
        {
            var parentDir = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
            if (parentDir != null)
            {
                dataDir = Path.Combine(parentDir, "data");
            }
        }
        _configFilePath = Path.Combine(dataDir, "config.json");
    }

    public async Task<AppConfig> GetConfigAsync()
    {
        if (!File.Exists(_configFilePath))
        {
            return new AppConfig();
        }

        try
        {
            var json = await File.ReadAllTextAsync(_configFilePath);
            return JsonSerializer.Deserialize<AppConfig>(json) ?? new AppConfig();
        }
        catch
        {
            return new AppConfig();
        }
    }

    public async Task SaveConfigAsync(AppConfig config)
    {
        var dir = Path.GetDirectoryName(_configFilePath);
        if (dir != null && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        var json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_configFilePath, json);
    }
}

public class AppConfig
{
    public string? CalendarId { get; set; }
}
