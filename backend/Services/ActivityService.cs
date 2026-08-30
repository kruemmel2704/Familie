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
    private readonly AiAgentService _aiAgentService;

    public ActivityService(AiAgentService aiAgentService)
    {
        _aiAgentService = aiAgentService;
    }

    public async Task<List<Activity>> GetActivitiesAsync()
    {
        return await _aiAgentService.GetActivitiesAsync();
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
}
