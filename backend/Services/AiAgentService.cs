using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services;

public class AiAgentService
{
    private readonly HttpClient _httpClient;
    private readonly string _dataDir;
    private readonly string _aiCacheFile;
    private readonly string _fallbackFile;

    public AiAgentService(HttpClient httpClient)
    {
        _httpClient = httpClient;

        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "data");
        if (!Directory.Exists(dataDir))
        {
            var parentDir = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
            if (parentDir != null)
            {
                var candidate = Path.Combine(parentDir, "data");
                if (Directory.Exists(candidate))
                {
                    dataDir = candidate;
                }
            }
        }

        _dataDir = dataDir;
        _aiCacheFile = Path.Combine(_dataDir, "ai_generated_activities.json");
        _fallbackFile = Path.Combine(_dataDir, "activities.json");
    }

    public string? GetApiKey()
    {
        return Environment.GetEnvironmentVariable("GEMINI_API_KEY") 
               ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY");
    }

    public async Task<List<Activity>> GetActivitiesAsync()
    {
        var cached = await LoadAiCacheAsync();
        if (cached != null && cached.Count > 0)
        {
            return cached;
        }

        var apiKey = GetApiKey();
        if (!string.IsNullOrEmpty(apiKey))
        {
            return await FetchFreshActivitiesAsync();
        }

        return await LoadFallbackActivitiesAsync();
    }

    public async Task<List<Activity>> FetchFreshActivitiesAsync(int count = 15)
    {
        var apiKey = GetApiKey();
        if (string.IsNullOrEmpty(apiKey))
        {
            return await LoadFallbackActivitiesAsync();
        }

        var prompt = $@"
Du bist ein erfahrener KI-Reiseführer und Freizeitagent für Mainz und die Rhein-Main-Region.
Erstelle eine Liste von {count} abwechslungsreichen, aktuellen Freizeitaktivitäten für Familien mit Kindern in Mainz und der näheren Umgebung (z.B. Wiesbaden, Bingen, Ingelheim, Frankfurt, Darmstadt), die hervorragend mit öffentlichen Verkehrsmitteln (ÖPNV - Bus, Tram, S-Bahn, Regionalbahn) erreichbar sind.

WICHTIG:
- Berücksichtige sowohl In- als auch Outdoor-Aktivitäten, Parks, Museen, Tierparks, Erlebnisspielplätze und Ausflugsziele.
- Jedes Ziel muss mit Öffis gut erreichbar sein.
- Gib die Antwort ausschließlich als gültiges JSON-Array zurück.
- Jedes Objekt im Array MUSS exakt folgende Schlüssel besitzen:
  - ""id"": eine eindeutige Zahl (z.B. 1, 2, 3...)
  - ""title"": ein prägnanter, einladender Titel der Aktivität
  - ""description"": eine spannende, kinder- und familienfreundliche Beschreibung (2-3 Sätze)
  - ""destination"": Der genaue Zielort für die Anzeige (z.B. ""Volkspark, Mainz"" oder ""Naturhistorisches Museum, Mainz"")
  - ""destination_query"": Der exakte Suchbegriff für die Google-Maps-ÖPNV-Routenplanung (z.B. ""Volkspark Mainz"" oder ""Naturhistorisches Museum Mainz"")

Beispiel-Struktur:
[
  {{
    ""id"": 1,
    ""title"": ""Abenteuer im Volkspark Mainz"",
    ""description"": ""Ein riesiger Park mit einem tollen Wasserspielplatz, einer Minibahn und viel Platz zum Toben. Perfekt für einen sonnigen Tag!"",
    ""destination"": ""Volkspark, Mainz"",
    ""destination_query"": ""Volkspark Mainz""
  }}
]
";

        try
        {
            var textResult = await CallGeminiApiAsync(prompt, apiKey);
            if (!string.IsNullOrWhiteSpace(textResult))
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    NumberHandling = JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString
                };

                var rawList = JsonSerializer.Deserialize<List<RawActivity>>(textResult, options);
                if (rawList != null && rawList.Count > 0)
                {
                    var cleaned = rawList.Select((act, index) => new Activity
                    {
                        Id = act.Id != 0 ? act.Id : index + 1,
                        Title = act.Title ?? $"Aktivität {index + 1}",
                        Description = act.Description ?? "",
                        Destination = act.Destination ?? "Mainz",
                        DestinationQuery = !string.IsNullOrEmpty(act.DestinationQuery) ? act.DestinationQuery : (act.Destination ?? "Mainz"),
                        RecipeUrl = act.RecipeUrl
                    }).ToList();

                    await SaveAiCacheAsync(cleaned);
                    return cleaned;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Fehler beim Aufruf der Gemini API: {ex.Message}");
        }

        return await GetActivitiesAsync();
    }

    public async Task<Activity> SearchActivityByIdeaAsync(string ideaPrompt)
    {
        var apiKey = GetApiKey();
        if (string.IsNullOrEmpty(apiKey))
        {
            return new Activity
            {
                Id = 999,
                Title = $"Ausflug zu: {ideaPrompt}",
                Description = $"Ein schöner Ausflug zum Thema '{ideaPrompt}' in Mainz.",
                Destination = "Mainz",
                DestinationQuery = $"{ideaPrompt} Mainz"
            };
        }

        var prompt = $@"
Du bist ein erfahrener KI-Reiseführer und Freizeitagent für Familien in Mainz und der Rhein-Main-Region.
Ein Benutzer hat folgendes Wunscherlebnis geäußert:
""{ideaPrompt}""

Suche eine konkrete, perfekt dazu passende Freizeitaktivität oder Ausflugsziel in Mainz oder der näheren Umgebung (Wiesbaden, Frankfurt, Bingen, Ingelheim, Darmstadt), das hervorragend mit öffentlichen Verkehrsmitteln (ÖPNV - Bus, Tram, S-Bahn, Regionalbahn) erreichbar ist.

WICHTIG:
- Gib die Antwort ausschließlich als ein einzelnes gültiges JSON-Objekt zurück (KEIN Array).
- Das Objekt MUSS exakt folgende Schlüssel besitzen:
  - ""id"": 999
  - ""title"": ein prägnanter, einladender Titel der Aktivität
  - ""description"": eine spannende, kinder- und familienfreundliche Beschreibung (2-3 Sätze), die erklärt warum dieser Ort perfekt zur Idee ""{ideaPrompt}"" passt
  - ""destination"": Der genaue Zielort für die Anzeige (z.B. ""Volkspark, Mainz"" oder ""Senckenberg Museum, Frankfurt am Main"")
  - ""destination_query"": Der exakte Suchbegriff für die Google-Maps-ÖPNV-Routenplanung (z.B. ""Volkspark Mainz"" oder ""Senckenberg Museum Frankfurt"")

Beispiel-Struktur:
{{
  ""id"": 999,
  ""title"": ""Dinosaurier-Abenteuer im Naturhistorischen Museum"",
  ""description"": ""Für alle Dino-Fans das ideale Ziel: Hier könnt ihr fossile Knochen und spannende Tierwelten in Mainz entdecken!"",
  ""destination"": ""Naturhistorisches Museum, Mainz"",
  ""destination_query"": ""Naturhistorisches Museum Mainz""
}}
";

        try
        {
            var textResult = await CallGeminiApiAsync(prompt, apiKey);
            if (!string.IsNullOrWhiteSpace(textResult))
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    NumberHandling = JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString
                };

                if (textResult.Trim().StartsWith("["))
                {
                    var list = JsonSerializer.Deserialize<List<RawActivity>>(textResult, options);
                    if (list != null && list.Count > 0)
                    {
                        var first = list[0];
                        return new Activity
                        {
                            Id = 999,
                            Title = first.Title ?? $"Aktivität zu '{ideaPrompt}'",
                            Description = first.Description ?? "",
                            Destination = first.Destination ?? "Mainz",
                            DestinationQuery = first.DestinationQuery ?? first.Destination ?? "Mainz"
                        };
                    }
                }
                else
                {
                    var single = JsonSerializer.Deserialize<RawActivity>(textResult, options);
                    if (single != null && !string.IsNullOrEmpty(single.Title))
                    {
                        return new Activity
                        {
                            Id = 999,
                            Title = single.Title,
                            Description = single.Description ?? "",
                            Destination = single.Destination ?? "Mainz",
                            DestinationQuery = single.DestinationQuery ?? single.Destination ?? "Mainz"
                        };
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Fehler bei KI-Ideensuche: {ex.Message}");
        }

        return new Activity
        {
            Id = 999,
            Title = $"Aktivität zu '{ideaPrompt}'",
            Description = $"Ein tolles Familienerlebnis rund um '{ideaPrompt}' in Mainz.",
            Destination = "Mainz",
            DestinationQuery = $"{ideaPrompt} Mainz"
        };
    }

    public async Task<AiStatusResponse> GetStatusAsync()
    {
        var apiKey = GetApiKey();
        var cacheExists = File.Exists(_aiCacheFile);
        var activities = await GetActivitiesAsync();

        return new AiStatusResponse(
            GeminiKeyExists: !string.IsNullOrEmpty(apiKey),
            AiCacheExists: cacheExists,
            AiActivitiesCount: activities.Count
        );
    }

    private async Task<string?> CallGeminiApiAsync(string prompt, string apiKey)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
        
        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                responseMimeType = "application/json"
            }
        };

        var jsonBody = JsonSerializer.Serialize(payload);
        var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(url, content);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Gemini API HTTP Error {response.StatusCode}: {err}");
            return null;
        }

        var resJson = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(resJson);

        if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
            candidates.GetArrayLength() > 0)
        {
            var firstCand = candidates[0];
            if (firstCand.TryGetProperty("content", out var contentElem) &&
                contentElem.TryGetProperty("parts", out var parts) &&
                parts.GetArrayLength() > 0)
            {
                return parts[0].GetProperty("text").GetString();
            }
        }

        return null;
    }

    private async Task<List<Activity>?> LoadAiCacheAsync()
    {
        if (File.Exists(_aiCacheFile))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_aiCacheFile);
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var rawList = JsonSerializer.Deserialize<List<RawActivity>>(json, options);
                if (rawList != null && rawList.Count > 0)
                {
                    return rawList.Select(r => new Activity
                    {
                        Id = r.Id,
                        Title = r.Title ?? "",
                        Description = r.Description ?? "",
                        Destination = r.Destination ?? "",
                        DestinationQuery = r.DestinationQuery ?? "",
                        RecipeUrl = r.RecipeUrl
                    }).ToList();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Lesen des AI Cache: {ex.Message}");
            }
        }
        return null;
    }

    private async Task SaveAiCacheAsync(List<Activity> activities)
    {
        try
        {
            Directory.CreateDirectory(_dataDir);
            var rawList = activities.Select(a => new RawActivity
            {
                Id = a.Id,
                Title = a.Title,
                Description = a.Description,
                Destination = a.Destination,
                DestinationQuery = a.DestinationQuery,
                RecipeUrl = a.RecipeUrl
            }).ToList();

            var json = JsonSerializer.Serialize(rawList, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_aiCacheFile, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Fehler beim Speichern des AI Cache: {ex.Message}");
        }
    }

    private async Task<List<Activity>> LoadFallbackActivitiesAsync()
    {
        if (File.Exists(_fallbackFile))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_fallbackFile);
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var rawList = JsonSerializer.Deserialize<List<RawActivity>>(json, options);
                if (rawList != null)
                {
                    return rawList.Select(r => new Activity
                    {
                        Id = r.Id,
                        Title = r.Title ?? "",
                        Description = r.Description ?? "",
                        Destination = r.Destination ?? "",
                        DestinationQuery = r.DestinationQuery ?? "",
                        RecipeUrl = r.RecipeUrl
                    }).ToList();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fehler beim Lesen der Fallback-Datei: {ex.Message}");
            }
        }
        return new List<Activity>();
    }

    private class RawActivity
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Destination { get; set; }

        [JsonPropertyName("destination_query")]
        public string? DestinationQuery { get; set; }

        [JsonPropertyName("recipe_url")]
        public string? RecipeUrl { get; set; }
    }
}

public record AiStatusResponse(
    bool GeminiKeyExists,
    bool AiCacheExists,
    int AiActivitiesCount
);
