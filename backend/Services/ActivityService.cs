using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services;

public class ActivityService
{
    private readonly string _activitiesFilePath;

    public ActivityService()
    {
        var dataDir = Path.Combine(Directory.GetCurrentDirectory(), "data");
        if (!Directory.Exists(dataDir))
        {
            // Fallback to parent directory data folder if running in backend folder
            var parentDir = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
            if (parentDir != null)
            {
                dataDir = Path.Combine(parentDir, "data");
            }
        }
        _activitiesFilePath = Path.Combine(dataDir, "activities.json");
    }

    public async Task<List<Activity>> GetActivitiesAsync()
    {
        if (!File.Exists(_activitiesFilePath))
        {
            return new List<Activity>();
        }

        var json = await File.ReadAllTextAsync(_activitiesFilePath);
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString
        };
        
        // Custom mapping to handle title, description, destination, destination_query, recipe_url
        var rawActivities = JsonSerializer.Deserialize<List<RawActivity>>(json, options);
        if (rawActivities == null) return new List<Activity>();

        return rawActivities.Select(r => new Activity
        {
            Id = r.Id,
            Title = r.Title ?? "",
            Description = r.Description ?? "",
            Destination = r.Destination ?? "",
            DestinationQuery = r.DestinationQuery ?? "",
            RecipeUrl = r.RecipeUrl
        }).ToList();
    }

    public async Task<Activity?> GetRandomActivityAsync()
    {
        var activities = await GetActivitiesAsync();
        if (activities.Count == 0) return null;
        var random = new Random();
        return activities[random.Next(activities.Count)];
    }

    public async Task<List<Activity>> GetRandomActivitiesBatchAsync(int count = 3)
    {
        var activities = await GetActivitiesAsync();
        if (activities.Count == 0) return new List<Activity>();
        
        var random = new Random();
        return activities.OrderBy(x => random.Next()).Take(Math.Min(count, activities.Count)).ToList();
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
