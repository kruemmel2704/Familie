namespace Backend.Models;

public class Activity
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string DestinationQuery { get; set; } = string.Empty;
    public string? RecipeUrl { get; set; }
}
