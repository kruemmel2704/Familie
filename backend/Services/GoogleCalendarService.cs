using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Services;

public class GoogleCalendarService
{
    private readonly string _clientSecretPath;
    private readonly string _tokenDirectory;
    private readonly string[] _scopes = [CalendarService.Scope.CalendarEvents, CalendarService.Scope.CalendarReadonly];
    private const string UserId = "family-user";

    public GoogleCalendarService(IConfiguration configuration)
    {
        // Check standard locations for client_secret.json
        var rootDir = AppContext.BaseDirectory;
        // Go up to find project root if needed
        var candidatePath = Path.Combine(rootDir, "client_secret.json");
        if (!File.Exists(candidatePath))
        {
            // Try workspace root
            candidatePath = Path.Combine(Directory.GetCurrentDirectory(), "client_secret.json");
        }
        if (!File.Exists(candidatePath))
        {
            // Try one level up (if running from backend/)
            candidatePath = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory())?.FullName ?? "", "client_secret.json");
        }
        _clientSecretPath = candidatePath;
        _tokenDirectory = Path.Combine(Directory.GetCurrentDirectory(), "data");
    }

    public bool ClientSecretExists()
    {
        return File.Exists(_clientSecretPath);
    }

    private async Task<GoogleAuthorizationCodeFlow> CreateFlowAsync()
    {
        if (!ClientSecretExists())
        {
            throw new FileNotFoundException("client_secret.json wurde nicht gefunden.");
        }

        using var stream = new FileStream(_clientSecretPath, FileMode.Open, FileAccess.Read);
        var secrets = (await GoogleClientSecrets.FromStreamAsync(stream)).Secrets;

        return new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = secrets,
            Scopes = _scopes,
            DataStore = new FileDataStore(_tokenDirectory, true)
        });
    }

    public async Task<string> GetAuthorizationUrlAsync(string redirectUri)
    {
        if (!ClientSecretExists())
        {
            throw new FileNotFoundException("client_secret.json wurde nicht gefunden.");
        }

        using var stream = new FileStream(_clientSecretPath, FileMode.Open, FileAccess.Read);
        var secrets = (await GoogleClientSecrets.FromStreamAsync(stream)).Secrets;

        var flow = await CreateFlowAsync();
        var request = new Google.Apis.Auth.OAuth2.Requests.GoogleAuthorizationCodeRequestUrl(new Uri(flow.AuthorizationServerUrl))
        {
            ClientId = secrets.ClientId,
            RedirectUri = redirectUri,
            Scope = string.Join(" ", flow.Scopes),
            AccessType = "offline",
            Prompt = "consent"
        };
        return request.Build().ToString();
    }

    public async Task ExchangeCodeForTokenAsync(string code, string redirectUri)
    {
        var flow = await CreateFlowAsync();
        var token = await flow.ExchangeCodeForTokenAsync(UserId, code, redirectUri, CancellationToken.None);
        await flow.DataStore.StoreAsync(UserId, token);
    }

    public async Task<CalendarService> GetCalendarServiceAsync()
    {
        var flow = await CreateFlowAsync();
        var credential = new UserCredential(flow, UserId, await flow.DataStore.GetAsync<TokenResponse>(UserId));
        
        // Refresh token if expired/stale
        if (credential.Token.IsStale)
        {
            await credential.RefreshTokenAsync(CancellationToken.None);
        }

        return new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Familien-Abenteuer"
        });
    }

    public async Task<IList<CalendarListEntry>> GetCalendarsAsync()
    {
        var service = await GetCalendarServiceAsync();
        var listRequest = service.CalendarList.List();
        var calendarList = await listRequest.ExecuteAsync();
        return calendarList.Items ?? new List<CalendarListEntry>();
    }

    public async Task<Event> CreateEventAsync(string calendarId, string title, string description, string destination, string startDateTimeStr, bool haileyLarsAlone)
    {
        var service = await GetCalendarServiceAsync();
        
        DateTime startDt;
        if (!string.IsNullOrEmpty(startDateTimeStr) && DateTime.TryParse(startDateTimeStr, out var parsedDt))
        {
            startDt = parsedDt;
        }
        else
        {
            startDt = DateTime.UtcNow.AddHours(1);
        }

        var endDt = startDt.AddHours(3);

        var eventTitle = title;
        if (haileyLarsAlone)
        {
            eventTitle = "Hailey & Lars: " + eventTitle;
        }

        var newEvent = new Event
        {
            Summary = eventTitle,
            Location = destination,
            Description = description,
            Start = new EventDateTime
            {
                DateTimeDateTimeOffset = startDt,
                TimeZone = "Europe/Berlin"
            },
            End = new EventDateTime
            {
                DateTimeDateTimeOffset = endDt,
                TimeZone = "Europe/Berlin"
            }
        };

        var request = service.Events.Insert(newEvent, calendarId);
        return await request.ExecuteAsync();
    }
}
