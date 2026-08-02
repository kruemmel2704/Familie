using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSingleton<ActivityService>();
builder.Services.AddSingleton<GoogleCalendarService>();
builder.Services.AddSingleton<ConfigService>();

// Enable CORS for React Frontend (typically port 5173 or 3000)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("AllowReactApp");

// Activities API
app.MapGet("/api/activities/random", async (ActivityService activityService) =>
{
    var activity = await activityService.GetRandomActivityAsync();
    return activity != null ? Results.Ok(activity) : Results.NotFound("Keine Aktivitäten gefunden.");
});

app.MapGet("/api/activities/batch", async (ActivityService activityService) =>
{
    var batch = await activityService.GetRandomActivitiesBatchAsync();
    return Results.Ok(batch);
});

// Config API
app.MapGet("/api/config", async (ConfigService configService) =>
{
    var config = await configService.GetConfigAsync();
    return Results.Ok(config);
});

app.MapPost("/api/config", async (AppConfig config, ConfigService configService) =>
{
    await configService.SaveConfigAsync(config);
    return Results.Ok(new { success = true, message = "Konfiguration gespeichert." });
});

// Google Calendar API
app.MapGet("/api/calendar/status", (GoogleCalendarService calendarService) =>
{
    return Results.Ok(new { 
        clientSecretExists = calendarService.ClientSecretExists()
    });
});

app.MapGet("/api/calendar/auth-url", async (string redirectUri, GoogleCalendarService calendarService) =>
{
    try
    {
        var authUrl = await calendarService.GetAuthorizationUrlAsync(redirectUri);
        return Results.Ok(new { authUrl });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapGet("/api/calendar/callback", async (string code, string redirectUri, GoogleCalendarService calendarService) =>
{
    try
    {
        await calendarService.ExchangeCodeForTokenAsync(code, redirectUri);
        return Results.Ok(new { success = true });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapGet("/api/calendar/list", async (GoogleCalendarService calendarService) =>
{
    try
    {
        var calendars = await calendarService.GetCalendarsAsync();
        return Results.Ok(calendars);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/calendar/event", async (CreateEventRequest req, GoogleCalendarService calendarService, ConfigService configService) =>
{
    try
    {
        var config = await configService.GetConfigAsync();
        if (string.IsNullOrEmpty(config.CalendarId))
        {
            return Results.BadRequest(new { success = false, error = "Kein Kalender in den Einstellungen ausgewählt." });
        }

        var ev = await calendarService.CreateEventAsync(
            config.CalendarId,
            req.Title,
            req.Description,
            req.Destination,
            req.EventDatetime,
            req.HaileyLarsAlone
        );

        return Results.Ok(new { success = true, eventLink = ev.HtmlLink });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { success = false, error = ex.Message });
    }
});

// Serve frontend if embedded, otherwise just run backend
app.Run();

public record CreateEventRequest(
    string Title, 
    string Description, 
    string Destination, 
    string EventDatetime, 
    bool HaileyLarsAlone
);

