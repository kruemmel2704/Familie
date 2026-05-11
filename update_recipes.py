import json
import urllib.request
import urllib.parse
import re
import time

def search_recipe(query):
    url = "https://lite.duckduckgo.com/lite/"
    data = urllib.parse.urlencode({'q': query + ' site:chefkoch.de'}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'href="(https://www.chefkoch.de/rezepte/[^"]+)"', html)
        if match:
            return match.group(1)
    except Exception as e:
        print("Error", query, e)
    # fallback
    return "https://www.chefkoch.de/rs/s0/" + urllib.parse.quote(query) + "/Rezepte.html"

with open('data/activities.json', 'r') as f:
    activities = json.load(f)

food_keywords = ['Kochen', 'Abendessen', 'Backtag', 'Pizza-Bäcker']

for act in activities:
    title = act['title']
    if any(k in title for k in food_keywords) or 'Salzteig' in title:
        query = title.replace('Kochen: ', '').replace('Abendessen: ', '').replace('!', '')
        if 'Pizza-Bäcker' in query: query = 'Pizza selber machen'
        elif 'Backtag' in query: query = 'Muffins'
        
        print("Searching for:", query)
        link = search_recipe(query)
        print("Found:", link)
        act['recipe_url'] = link
        time.sleep(1)

with open('data/activities.json', 'w') as f:
    json.dump(activities, f, indent=2, ensure_ascii=False)
    
print("Done")
