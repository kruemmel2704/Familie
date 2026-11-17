using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

namespace Backend.Services;

/// <summary>
/// Hintergrunddienst, der die KI-Aktivitäten-Datenbank automatisch einmal pro
/// Woche aktualisiert. Der Fälligkeitszeitpunkt wird aus dem Dateistempel des
/// Caches abgeleitet und ist damit neustart-sicher (das data-Verzeichnis ist ein
/// gemountetes Volume): ein Neustart löst keine überflüssige Generierung aus,
/// und eine fällige Aktualisierung wird nach einem Neustart nachgeholt.
/// </summary>
public class WeeklyRefreshService : BackgroundService
{
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromDays(7);

    // Wie oft geprüft wird, ob eine Aktualisierung fällig ist.
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(6);

    private readonly AiAgentService _aiAgentService;

    public WeeklyRefreshService(AiAgentService aiAgentService)
    {
        _aiAgentService = aiAgentService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Kleine Verzögerung nach dem Start, damit der Webserver zuerst hochfährt.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (ShouldRefresh())
                {
                    Console.WriteLine($"[WeeklyRefresh] DB-Aktualisierung fällig – generiere neue Aktivitäten ({DateTime.UtcNow:u}).");
                    var fresh = await _aiAgentService.FetchFreshActivitiesAsync(20);
                    Console.WriteLine($"[WeeklyRefresh] {fresh.Count} Aktivitäten aktualisiert.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WeeklyRefresh] Fehler bei der automatischen Aktualisierung: {ex.Message}");
            }

            try
            {
                await Task.Delay(CheckInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private bool ShouldRefresh()
    {
        // Ohne API-Key kann nichts generiert werden.
        if (string.IsNullOrEmpty(_aiAgentService.GetApiKey()))
        {
            return false;
        }

        var lastRefresh = _aiAgentService.GetLastRefreshUtc();

        // Noch nie generiert -> jetzt erstmalig befüllen.
        if (lastRefresh == null)
        {
            return true;
        }

        // Fällig, wenn die letzte Aktualisierung mindestens eine Woche her ist.
        return DateTime.UtcNow - lastRefresh.Value >= RefreshInterval;
    }
}
