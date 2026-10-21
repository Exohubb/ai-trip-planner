import type { Day, Itinerary, Stop } from "@shared/itinerarySchema";

/**
 * Featured destinations shown on the planner page. Each one ships with a
 * hand-written sample itinerary that opens instantly (no API call, so it
 * also works in demo mode without a Gemini key), plus a prompt used when
 * the user asks the AI to generate a personalized plan instead.
 */

export interface Destination {
  id: string;
  name: string;
  country: string;
  tagline: string;
  /** Unsplash photo URL (the card falls back to `gradient` if it fails to load). */
  image: string;
  gradient: string;
  idealDays: number;
  bestTime: string;
  budgetLevel: 1 | 2 | 3;
  tags: string[];
  /** Description sent to the AI when generating a personalized plan. */
  prompt: string;
  sample: Itinerary;
}

function photo(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;
}

/** [time, title, category, location, description, price, notes] */
type StopTuple = [string, string, string, string, string, string, string];

function makeDay(prefix: string, index: number, title: string, summary: string, stops: StopTuple[]): Day {
  return {
    id: index,
    title,
    summary,
    stops: stops.map(
      ([time, stopTitle, category, location, description, price, notes], i): Stop => ({
        id: `${prefix}-d${index}-s${i + 1}`,
        type: "stop",
        time,
        title: stopTitle,
        category,
        location,
        description,
        price,
        notes,
      }),
    ),
  };
}

export const DESTINATIONS: Destination[] = [
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    tagline: "Temples, tea houses and lantern-lit lanes",
    image: photo("1493976040374-85c8e12f0c0e"),
    gradient: "linear-gradient(135deg, #f97316, #db2777)",
    idealDays: 3,
    bestTime: "Late Mar–Apr, Nov",
    budgetLevel: 2,
    tags: ["Culture", "Food", "Gardens"],
    prompt: "Kyoto, Japan: classic temples and shrines, zen gardens, a tea ceremony and the best local food.",
    sample: {
      title: "Timeless Kyoto",
      destination: "Kyoto, Japan",
      summary:
        "Three unhurried days of vermilion shrines, bamboo forests, zen gardens and kaiseki-style dining in Japan's ancient capital.",
      bestTime: "Late March–early April (cherry blossoms) or November (autumn leaves)",
      budget: {
        currency: "JPY",
        items: [
          { label: "Accommodation", amount: 45000 },
          { label: "Food", amount: 24000 },
          { label: "Activities", amount: 9000 },
          { label: "Local transport", amount: 3000 },
        ],
        total: 81000,
      },
      packingList: [
        "Slip-on shoes (temples need shoes off)",
        "ICOCA transit card",
        "Portable charger",
        "Light layers",
        "Coin purse",
        "Small hand towel",
        "Reusable water bottle",
      ],
      tips: [
        "Load an ICOCA card for buses and trains.",
        "Many temples close by 5 PM, so start early.",
        "Cash is still king at small shops and shrines.",
        "Tipping isn't customary in Japan.",
      ],
      days: [
        makeDay("kyoto", 1, "Higashiyama's timeless lanes", "Torii tunnels at dawn, a hillside temple and an evening in Gion.", [
          ["7:30 AM", "Fushimi Inari Taisha", "sight", "Fushimi Inari, Fushimi-ku", "Walk the tunnel of thousands of vermilion torii gates up Mount Inari before the crowds arrive.", "Free", "Go before 8 AM; the trail past Yotsutsuji is quietest."],
          ["11:00 AM", "Kiyomizu-dera", "culture", "Kiyomizu-dera, Higashiyama", "Hillside temple with a famous wooden stage overlooking the city.", "¥500", "Leave via Sannenzaka and Ninenzaka for preserved Edo-era streets."],
          ["1:00 PM", "Yudofu lunch at Okutan", "food", "Okutan, near Kiyomizu-dera", "Kyoto's oldest simmered-tofu restaurant, serving in a garden setting since 1635.", "¥4,400", "Set menu only; arrive before 1:30 PM."],
          ["6:30 PM", "Gion evening stroll", "culture", "Hanamikoji Street, Gion", "Lantern-lit teahouse street where you may glimpse geiko heading to appointments.", "Free", "Photography is banned on private lanes, so respect the signs."],
        ]),
        makeDay("kyoto", 2, "Arashiyama bamboo & zen", "Bamboo groves, a UNESCO zen garden and the Golden Pavilion.", [
          ["8:00 AM", "Arashiyama Bamboo Grove", "nature", "Sagano, Arashiyama", "Towering bamboo stalks that sway and creak in the breeze.", "Free", "Take the JR Sagano line to Saga-Arashiyama station."],
          ["9:30 AM", "Tenryu-ji Temple", "culture", "Tenryu-ji, Arashiyama", "UNESCO-listed zen temple with a 14th-century pond garden framed by mountains.", "¥500", "The north gate opens straight into the bamboo grove."],
          ["12:30 PM", "Shojin ryori at Shigetsu", "food", "Tenryu-ji grounds", "Buddhist vegetarian multi-course meal served inside the temple.", "¥3,300", "Reserve at least a day ahead."],
          ["3:00 PM", "Kinkaku-ji (Golden Pavilion)", "sight", "Kinkaku-ji, Kita-ku", "Gold-leaf pavilion reflected perfectly in a mirror pond.", "¥500", "Afternoon light makes the gold glow."],
        ]),
        makeDay("kyoto", 3, "Markets, matcha & philosophers", "Kyoto's kitchen, a tea ceremony and a canal-side walk.", [
          ["9:00 AM", "Nishiki Market", "food", "Nishiki-koji, Nakagyo", "Five blocks of stalls nicknamed 'Kyoto's Kitchen'. Try tamagoyaki and pickles.", "¥2,000", "Eat at the stall; eating while walking is frowned upon."],
          ["11:30 AM", "Tea ceremony in a machiya", "activity", "Camellia Garden, Higashiyama", "Learn the ritual of matcha preparation from a tea master.", "¥4,000", "Book online; sessions run in English."],
          ["2:00 PM", "Philosopher's Path", "nature", "Tetsugaku-no-michi, Sakyo", "Canal-side walk lined with cherry trees between Ginkaku-ji and Nanzen-ji.", "Free", "Detour to Honen-in, a mossy hidden temple."],
          ["7:00 PM", "Dinner in Pontocho", "food", "Pontocho Alley", "Narrow alley of restaurants; in summer, dine on platforms over the river.", "¥6,000", "Many places need reservations."],
        ]),
      ],
    },
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    tagline: "Art, cafés and the city of light",
    image: photo("1502602898657-3e91760cbb34"),
    gradient: "linear-gradient(135deg, #6366f1, #0ea5e9)",
    idealDays: 3,
    bestTime: "Apr–Jun, Sep–Oct",
    budgetLevel: 3,
    tags: ["Art", "Food", "Romance"],
    prompt: "Paris, France: world-class museums, classic cafés and bistros, Montmartre and the Eiffel Tower at night.",
    sample: {
      title: "Paris, Mon Amour",
      destination: "Paris, France",
      summary: "Impressionist masterpieces, café terraces, Marais boutiques and the Eiffel Tower sparkling after dark.",
      bestTime: "April–June and September–October",
      budget: {
        currency: "EUR",
        items: [
          { label: "Accommodation", amount: 540 },
          { label: "Food", amount: 210 },
          { label: "Activities", amount: 110 },
          { label: "Local transport", amount: 30 },
        ],
        total: 890,
      },
      packingList: [
        "Comfortable walking shoes",
        "Compact umbrella",
        "Smart-casual dinner outfit",
        "Navigo Easy card",
        "Cross-body bag",
        "Type E plug adapter",
      ],
      tips: [
        "Use a Navigo Easy card for metro rides.",
        "Always say 'Bonjour' when entering a shop.",
        "Many museums are free on the first Sunday of the month (booking still required).",
        "Watch for pickpockets around major sights.",
      ],
      days: [
        makeDay("paris", 1, "Icons of the Left Bank", "Impressionists, Saint-Germain cafés and a sunset summit.", [
          ["9:00 AM", "Musée d'Orsay", "culture", "Musée d'Orsay, 7th arr.", "Monet, Van Gogh and Renoir in a Beaux-Arts railway station.", "€16", "The 5th-floor clock window is a great photo spot."],
          ["12:30 PM", "Lunch at Café de Flore", "food", "Saint-Germain-des-Prés, 6th arr.", "Historic literary café for a croque-monsieur and people-watching.", "€30", "Sit on the terrace; service is leisurely by design."],
          ["3:00 PM", "Luxembourg Gardens", "nature", "Jardin du Luxembourg, 6th arr.", "Formal gardens with the Medici Fountain and iconic green chairs.", "Free", "Watch the toy sailboats on the Grand Bassin."],
          ["7:30 PM", "Eiffel Tower at sunset", "sight", "Champ de Mars, 7th arr.", "Ride to the summit for golden-hour views, then watch it sparkle on the hour.", "€29", "Book summit tickets online weeks ahead."],
        ]),
        makeDay("paris", 2, "Louvre, Marais & the Seine", "The world's biggest museum, falafel and a night cruise.", [
          ["9:00 AM", "The Louvre", "culture", "Musée du Louvre, 1st arr.", "The Mona Lisa, Winged Victory and Venus de Milo under one roof.", "€22", "Enter via the Carrousel du Louvre to skip the pyramid queue."],
          ["1:00 PM", "Falafel on Rue des Rosiers", "food", "L'As du Fallafel, Le Marais", "Legendary pita stuffed with falafel, grilled eggplant and tahini.", "€9", "The queue moves fast; order the 'spécial'."],
          ["3:00 PM", "Place des Vosges & boutiques", "shopping", "Le Marais, 3rd–4th arr.", "Paris's oldest square, ringed by galleries and independent shops.", "Free", "Many Marais shops open on Sundays."],
          ["8:30 PM", "Seine river cruise", "activity", "Pont de l'Alma", "One-hour cruise past Notre-Dame and illuminated bridges.", "€17", "Sit on the open top deck and bring a layer."],
        ]),
        makeDay("paris", 3, "Montmartre & café life", "Hilltop basilica, artists' square and a rooftop view.", [
          ["9:30 AM", "Sacré-Cœur", "sight", "Montmartre, 18th arr.", "White-domed basilica crowning the city's highest hill.", "Free", "Climb the dome for an even wider view."],
          ["11:00 AM", "Place du Tertre", "culture", "Place du Tertre, Montmartre", "Painters at work in a village-like square.", "Free", "Agree on a price before sitting for a portrait."],
          ["1:00 PM", "Bistro lunch at Le Consulat", "food", "Rue Norvins, Montmartre", "Classic bistro fare: onion soup and duck confit.", "€35", "The plat du jour is the best value."],
          ["4:00 PM", "Galeries Lafayette rooftop", "shopping", "Boulevard Haussmann, 9th arr.", "Art Nouveau dome and a free rooftop terrace with skyline views.", "Free", "Take the escalators to the top floor for the terrace."],
        ]),
      ],
    },
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    tagline: "Rice terraces, temples and surf",
    image: photo("1537996194471-e657df975ab4"),
    gradient: "linear-gradient(135deg, #16a34a, #0d9488)",
    idealDays: 3,
    bestTime: "Apr–Oct",
    budgetLevel: 1,
    tags: ["Nature", "Beaches", "Wellness"],
    prompt: "Bali, Indonesia: Ubud rice terraces and temples, a volcano sunrise hike, beaches and clifftop sunsets.",
    sample: {
      title: "Island of the Gods",
      destination: "Bali, Indonesia",
      summary: "Emerald rice terraces, a volcano sunrise, water temples and clifftop sunsets over the Indian Ocean.",
      bestTime: "April–October (dry season)",
      budget: {
        currency: "IDR",
        items: [
          { label: "Accommodation", amount: 2400000 },
          { label: "Food", amount: 900000 },
          { label: "Activities", amount: 1300000 },
          { label: "Private driver", amount: 1500000 },
        ],
        total: 6100000,
      },
      packingList: [
        "Reef-safe sunscreen",
        "Sarong for temples",
        "Insect repellent",
        "Light rain jacket",
        "Headlamp for the Batur trek",
        "Swimwear",
        "Sandals",
      ],
      tips: [
        "Hire a private driver for day trips. It's affordable and saves time.",
        "Cover shoulders and knees at temples.",
        "Drink bottled or filtered water only.",
        "Carry small notes for entrance fees and donations.",
      ],
      days: [
        makeDay("bali", 1, "Ubud's rice terraces & temples", "Terraced valleys, a sacred spring and the monkey forest.", [
          ["7:00 AM", "Tegallalang Rice Terraces", "nature", "Tegallalang, Ubud", "Emerald terraces carved into the valley with the ancient subak irrigation system.", "IDR 50,000", "Arrive early for soft light and fewer crowds."],
          ["10:30 AM", "Tirta Empul water temple", "culture", "Tampaksiring", "Join locals in a purification ritual beneath sacred spring spouts.", "IDR 75,000", "Sarongs are provided; bring a change of clothes."],
          ["1:00 PM", "Babi guling lunch", "food", "Warung Ibu Oka, Ubud", "Bali's famous spit-roasted suckling pig with spicy sambal.", "IDR 75,000", "Go before 2 PM; it sells out."],
          ["4:00 PM", "Sacred Monkey Forest", "nature", "Monkey Forest Rd, Ubud", "Jungle sanctuary with mossy temples and hundreds of long-tailed macaques.", "IDR 100,000", "Keep sunglasses and snacks out of sight."],
        ]),
        makeDay("bali", 2, "Volcano sunrise & palace dance", "A pre-dawn summit, hot springs and an evening of Legong.", [
          ["2:00 AM", "Mount Batur sunrise trek", "activity", "Mount Batur, Kintamani", "Guided two-hour hike to watch the sun rise over the caldera lake.", "IDR 600,000", "Bring a headlamp and a warm layer."],
          ["9:30 AM", "Volcanic hot springs", "activity", "Toya Devasya, Lake Batur", "Natural hot pools with lake views to soothe trekking legs.", "IDR 250,000", "Most trek tours can add this on."],
          ["12:30 PM", "Coffee plantation tasting", "food", "Kintamani highlands", "Taste Balinese coffees and teas grown on the volcano's slopes.", "Free", "Plenty of brews to try besides kopi luwak."],
          ["7:30 PM", "Legong dance at Ubud Palace", "culture", "Puri Saren Agung, Ubud", "Graceful traditional dance with a live gamelan orchestra.", "IDR 100,000", "Arrive early for front-row seats."],
        ]),
        makeDay("bali", 3, "Beaches & clifftop sunsets", "Hidden coves, surf views and the Kecak fire dance.", [
          ["9:00 AM", "Padang Padang Beach", "nature", "Padang Padang, Uluwatu", "Small cove reached through a rock passage, with turquoise water.", "IDR 15,000", "Best at low tide; mornings are calmer."],
          ["12:30 PM", "Lunch at Single Fin", "food", "Suluban clifftop, Uluwatu", "Clifftop café overlooking world-famous surf breaks.", "IDR 150,000", "Watch surfers ride the break below."],
          ["5:30 PM", "Uluwatu Temple & Kecak dance", "culture", "Pura Luhur Uluwatu", "Sea temple on a 70 m cliff, then the fire-lit Kecak dance at sunset.", "IDR 200,000", "Guard hats and glasses from cheeky monkeys."],
          ["8:00 PM", "Jimbaran seafood dinner", "food", "Jimbaran Bay", "Fresh grilled seafood on the sand with your toes in the bay.", "IDR 300,000", "Agree on price per kilo before ordering."],
        ]),
      ],
    },
  },
  {
    id: "santorini",
    name: "Santorini",
    country: "Greece",
    tagline: "Blue domes and caldera sunsets",
    image: photo("1613395877344-13d4a8e0d49e"),
    gradient: "linear-gradient(135deg, #2563eb, #22d3ee)",
    idealDays: 3,
    bestTime: "May–Jun, Sep–Oct",
    budgetLevel: 3,
    tags: ["Islands", "Romance", "Wine"],
    prompt: "Santorini, Greece: the caldera hike, volcano boat trip, wineries, beaches and the best sunset spots.",
    sample: {
      title: "Santorini Sunsets",
      destination: "Santorini, Greece",
      summary: "Clifftop hikes, a volcano by boat, Bronze Age ruins, volcanic wines and the most famous sunsets in the Aegean.",
      bestTime: "May–June and September–October",
      budget: {
        currency: "EUR",
        items: [
          { label: "Accommodation", amount: 720 },
          { label: "Food", amount: 260 },
          { label: "Activities", amount: 110 },
          { label: "ATV / car rental", amount: 60 },
        ],
        total: 1150,
      },
      packingList: ["SPF 50 sunscreen", "Sunglasses and a hat", "Swimwear", "Walking sandals", "Linen clothing", "Water bottle"],
      tips: [
        "Rent an ATV or car to explore beyond Fira and Oia.",
        "Stay in Imerovigli for sunsets without Oia's crowds.",
        "Cruise-ship days are busiest, so check the port schedule.",
        "Tap water isn't drinkable; buy bottled.",
      ],
      days: [
        makeDay("santorini", 1, "Fira to Oia along the caldera", "The island's best hike, ending at the legendary sunset.", [
          ["9:00 AM", "Breakfast with a caldera view", "food", "Fira", "Greek yogurt and honey on a cliffside terrace in the capital.", "€15", "Eat early before the heat builds."],
          ["10:00 AM", "Fira–Oia caldera hike", "activity", "Caldera trail, Fira to Oia", "10 km clifftop trail through Firostefani and Imerovigli with jaw-dropping views.", "Free", "Bring water and sun protection; there's little shade."],
          ["2:00 PM", "Lunch in Oia", "food", "Oia back streets", "Fava, tomato fritters and grilled octopus overlooking the sea.", "€30", "The back-street tavernas are cheaper."],
          ["7:30 PM", "Oia sunset", "sight", "Oia Castle", "Watch the sun sink behind blue domes and windmills.", "Free", "Arrive an hour early or book a terrace table."],
        ]),
        makeDay("santorini", 2, "Volcano, ruins & red cliffs", "Hot springs by boat and a Bronze Age city.", [
          ["9:30 AM", "Volcano & hot springs boat", "nature", "Old Port, Fira", "Hike the crater of Nea Kameni and swim in warm springs at Palea Kameni.", "€35", "Wear old swimwear; the springs can stain."],
          ["2:00 PM", "Akrotiri archaeological site", "culture", "Akrotiri", "Minoan town preserved by volcanic ash, the 'Pompeii of the Aegean'.", "€12", "The covered site stays cool even in summer."],
          ["4:00 PM", "Red Beach lookout", "nature", "Akrotiri", "Dramatic red volcanic cliffs above a tiny beach.", "Free", "The cliff path can close due to rockfall."],
          ["8:00 PM", "Seafood in Ammoudi Bay", "food", "Ammoudi Bay, below Oia", "Waterfront tavernas serving the day's catch.", "€45", "Walk down the steps; take a taxi back up."],
        ]),
        makeDay("santorini", 3, "Wine, villages & black sand", "Medieval Pyrgos, volcanic wines and a beach afternoon.", [
          ["10:00 AM", "Pyrgos village", "culture", "Pyrgos", "Hilltop medieval village with winding lanes and a Venetian castle.", "Free", "Quieter and more authentic than Oia."],
          ["12:00 PM", "Wine tasting at Santo Wines", "food", "Santo Wines, Pyrgos", "Taste crisp Assyrtiko and sweet Vinsanto with caldera views.", "€30", "Pair it with the local cheese platter."],
          ["3:00 PM", "Perissa black sand beach", "nature", "Perissa", "Long volcanic beach with sunbeds and clear water.", "€15", "The sand gets very hot, so wear sandals."],
          ["8:00 PM", "Farewell dinner in Imerovigli", "food", "Imerovigli", "Fine dining at the highest point of the caldera.", "€80", "Reserve a sunset table days ahead."],
        ]),
      ],
    },
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    tagline: "Skylines, Broadway and bagels",
    image: photo("1485871981521-5b1fd3805eee"),
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    idealDays: 3,
    bestTime: "Apr–Jun, Sep–Nov",
    budgetLevel: 3,
    tags: ["City", "Food", "Nightlife"],
    prompt: "New York City, USA: iconic sights, Central Park, a Broadway show, Brooklyn Bridge and classic NYC food.",
    sample: {
      title: "Empire State of Mind",
      destination: "New York City, USA",
      summary: "Central Park mornings, world-class museums, Broadway lights and a sunset walk across the Brooklyn Bridge.",
      bestTime: "April–June and September–November",
      budget: {
        currency: "USD",
        items: [
          { label: "Accommodation", amount: 900 },
          { label: "Food", amount: 300 },
          { label: "Activities & shows", amount: 330 },
          { label: "Subway", amount: 40 },
        ],
        total: 1570,
      },
      packingList: ["Comfortable sneakers", "Contactless card for OMNY", "Layers", "Portable charger", "Small umbrella", "Day bag"],
      tips: [
        "Tap a contactless card on OMNY readers to ride the subway.",
        "Tip 18–20% at restaurants.",
        "Walk on the right and don't stop mid-sidewalk.",
        "Buy museum and observation deck tickets online.",
      ],
      days: [
        makeDay("new-york", 1, "Midtown & Central Park", "The park, the Met, skyline views and a Broadway night.", [
          ["9:00 AM", "Central Park stroll", "nature", "Central Park, Manhattan", "Walk from the Mall to Bethesda Terrace and Bow Bridge.", "Free", "Rent a Citi Bike to cover more ground."],
          ["11:30 AM", "The Met", "culture", "1000 Fifth Ave", "Egyptian temples, Old Masters and a seasonal rooftop garden.", "$30", "See the Temple of Dendur first, before the crowds."],
          ["3:00 PM", "Top of the Rock", "sight", "30 Rockefeller Plaza", "Views of the Empire State Building and Central Park from the 70th floor.", "$40", "Book a sunset slot for day-to-night views."],
          ["7:00 PM", "Broadway show", "nightlife", "Theater District", "Neon-lit Times Square, then a Broadway musical.", "$120", "The TKTS booth sells same-day discounts."],
        ]),
        makeDay("new-york", 2, "Downtown & the bridge", "Lady Liberty, DUMBO and the skyline at dusk.", [
          ["9:00 AM", "Statue of Liberty & Ellis Island", "sight", "Battery Park", "Ferry to Lady Liberty and the immigration museum.", "$25", "Book pedestal access in advance."],
          ["1:00 PM", "9/11 Memorial", "culture", "World Trade Center", "Reflecting pools set in the Twin Towers' footprints.", "Free", "Allow two hours if visiting the museum."],
          ["3:30 PM", "DUMBO & Brooklyn Bridge Park", "sight", "DUMBO, Brooklyn", "Cobblestone streets and the classic Manhattan Bridge photo on Washington St.", "Free", "Juliana's nearby is a top pizza stop."],
          ["6:00 PM", "Brooklyn Bridge at sunset", "activity", "Brooklyn Bridge", "Walk the 1883 bridge back to Manhattan as the skyline lights up.", "Free", "Stay out of the bike lane."],
          ["8:00 PM", "Dumplings in Chinatown", "food", "Mott St, Chinatown", "Soup dumplings and roast duck in bustling Chinatown.", "$25", "Joe's Shanghai is famous for xiao long bao."],
        ]),
        makeDay("new-york", 3, "Villages & the High Line", "Bagels, brownstones, an elevated park and mirrored sky rooms.", [
          ["9:30 AM", "Brunch at Russ & Daughters", "food", "Lower East Side", "Bagels with hand-sliced lox from a 1914 appetizing shop.", "$25", "Try the 'Classic' with scallion cream cheese."],
          ["11:30 AM", "Greenwich Village wander", "culture", "Greenwich Village", "Washington Square Park, brownstones and jazz-age history.", "Free", "Find the 'Friends' building at Bedford & Grove."],
          ["1:30 PM", "The High Line", "nature", "Gansevoort St to Hudson Yards", "Elevated park on a former rail line with gardens and public art.", "Free", "Start at the south end by the Whitney Museum."],
          ["3:30 PM", "Chelsea Market", "food", "75 Ninth Ave, Chelsea", "Food hall inside a former Nabisco factory.", "$20", "Los Tacos No. 1 is worth the queue."],
          ["6:00 PM", "SUMMIT One Vanderbilt", "sight", "One Vanderbilt, Midtown", "Mirrored sky rooms 1,000 ft above Manhattan.", "$45", "Wear trousers or shorts; the floors are mirrors."],
        ]),
      ],
    },
  },
  {
    id: "iceland",
    name: "Iceland",
    country: "Reykjavík & South Coast",
    tagline: "Waterfalls, glaciers and northern lights",
    image: photo("1476610182048-b716b8518aae"),
    gradient: "linear-gradient(135deg, #0f766e, #4338ca)",
    idealDays: 3,
    bestTime: "Jun–Aug, Sep–Mar",
    budgetLevel: 3,
    tags: ["Nature", "Adventure", "Road trip"],
    prompt: "Iceland: the Golden Circle, South Coast waterfalls and black sand beaches, a glacier hike, hot springs and Reykjavík.",
    sample: {
      title: "Fire & Ice Road Trip",
      destination: "Reykjavík & South Coast, Iceland",
      summary: "Self-drive the Golden Circle and South Coast: tectonic rifts, erupting geysers, walk-behind waterfalls and a glacier hike.",
      bestTime: "June–August (midnight sun) or September–March (northern lights)",
      budget: {
        currency: "ISK",
        items: [
          { label: "Accommodation", amount: 75000 },
          { label: "Food", amount: 30000 },
          { label: "Activities", amount: 32000 },
          { label: "Car rental & fuel", amount: 45000 },
        ],
        total: 182000,
      },
      packingList: ["Waterproof jacket & pants", "Thermal base layers", "Swimsuit", "Waterproof hiking boots", "Hat & gloves", "Quick-dry towel"],
      tips: [
        "Rent a car; the Golden Circle is easy to self-drive.",
        "Check road.is and safetravel.is before every drive.",
        "Tap water is excellent, so skip bottled.",
        "Cards are accepted almost everywhere.",
      ],
      days: [
        makeDay("iceland", 1, "The Golden Circle", "Tectonic plates, a spouting geyser and the Golden Falls.", [
          ["9:00 AM", "Þingvellir National Park", "nature", "Þingvellir", "Walk between the North American and Eurasian tectonic plates.", "ISK 1,000", "Snorkeling the Silfra fissure needs booking ahead."],
          ["12:00 PM", "Geysir & Strokkur", "nature", "Haukadalur", "Strokkur erupts every 5–10 minutes, shooting water up to 30 m.", "Free", "Stand upwind to stay dry."],
          ["2:00 PM", "Gullfoss waterfall", "sight", "Gullfoss", "Two-tiered 'Golden Falls' plunging into a rugged canyon.", "Free", "The lower path is misty, so wear waterproofs."],
          ["5:00 PM", "Secret Lagoon soak", "activity", "Flúðir", "Iceland's oldest natural hot spring pool, steaming among moss.", "ISK 4,000", "Calmer and cheaper than the Blue Lagoon."],
        ]),
        makeDay("iceland", 2, "South Coast waterfalls", "Walk behind a waterfall and stand on a black sand beach.", [
          ["9:00 AM", "Seljalandsfoss", "nature", "Seljalandsfoss, South Coast", "A waterfall you can walk all the way behind.", "ISK 800", "Wear a rain jacket; you will get wet."],
          ["10:30 AM", "Skógafoss", "nature", "Skógar", "A 60 m curtain of water, often crowned by a rainbow.", "Free", "Climb the 527 steps for the view from the top."],
          ["1:00 PM", "Lamb soup in Vík", "food", "Vík í Mýrdal", "Hearty Icelandic lamb soup in a seaside village.", "ISK 3,500", "Fuel up; services are sparse further east."],
          ["2:30 PM", "Reynisfjara black sand beach", "nature", "Reynisfjara", "Basalt columns and sea stacks on a black volcanic beach.", "Free", "Never turn your back on the waves."],
        ]),
        makeDay("iceland", 3, "Ice & the capital", "A guided glacier hike, Reykjavík landmarks and an aurora hunt.", [
          ["9:00 AM", "Sólheimajökull glacier hike", "activity", "Sólheimajökull", "Guided crampon hike across a glacier tongue.", "ISK 15,000", "Gear is provided; wear waterproof boots."],
          ["2:00 PM", "Hallgrímskirkja", "sight", "Reykjavík", "Expressionist church with tower views over the colorful city.", "ISK 1,400", "The tower lift closes in the late afternoon."],
          ["4:00 PM", "Harpa & the Old Harbour", "culture", "Reykjavík harbour", "Glass concert hall and harbour-side cafés.", "Free", "Grab a famous hot dog at Bæjarins Beztu nearby."],
          ["9:00 PM", "Northern lights hunt", "nature", "Outside Reykjavík", "Chase the aurora on a clear winter night.", "ISK 9,000", "Check the aurora forecast on vedur.is."],
        ]),
      ],
    },
  },
  {
    id: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    tagline: "Souks, riads and the Atlas Mountains",
    image: photo("1597212618440-806262de4f6b"),
    gradient: "linear-gradient(135deg, #c2410c, #a21caf)",
    idealDays: 3,
    bestTime: "Mar–May, Sep–Nov",
    budgetLevel: 1,
    tags: ["Culture", "Shopping", "Food"],
    prompt: "Marrakech, Morocco: the medina and souks, palaces and gardens, a hammam, Moroccan food and an Atlas Mountains day trip.",
    sample: {
      title: "Magic of Marrakech",
      destination: "Marrakech, Morocco",
      summary: "Cobalt gardens, tiled palaces, spice-scented souks, a steamy hammam and a day in the High Atlas.",
      bestTime: "March–May and September–November",
      budget: {
        currency: "MAD",
        items: [
          { label: "Riad stay", amount: 2400 },
          { label: "Food", amount: 1200 },
          { label: "Activities", amount: 1000 },
          { label: "Transport", amount: 800 },
        ],
        total: 5400,
      },
      packingList: ["Modest, breathable clothing", "Light scarf", "Closed walking shoes", "Sunscreen", "Small dirham notes", "Hand sanitizer"],
      tips: [
        "Politely decline unsolicited guides in the medina.",
        "Many shops close at midday on Fridays for prayers.",
        "Dress modestly and cover shoulders and knees.",
        "In petit taxis, insist on the meter.",
      ],
      days: [
        makeDay("marrakech", 1, "Medina magic", "Majorelle blue, palace tiles and the buzzing main square.", [
          ["9:00 AM", "Jardin Majorelle", "nature", "Gueliz", "Cobalt-blue garden restored by Yves Saint Laurent.", "MAD 165", "Book a timed ticket for opening time."],
          ["11:30 AM", "Bahia Palace", "culture", "Medina", "19th-century palace with zellige tiles and painted cedar ceilings.", "MAD 100", "An official guide at the gate brings it to life."],
          ["1:30 PM", "Rooftop lunch at Café des Épices", "food", "Rahba Kedima", "Tagine and mint tea above the spice square.", "MAD 120", "Ask for a rooftop table."],
          ["7:00 PM", "Jemaa el-Fnaa night market", "food", "Jemaa el-Fnaa", "Storytellers, musicians and smoking food stalls fill the square at dusk.", "MAD 100", "Check prices before sitting at a stall."],
        ]),
        makeDay("marrakech", 2, "Souks & hammam", "Haggling, a historic madrasa, a hidden garden and a scrub.", [
          ["9:30 AM", "Souk Semmarine", "shopping", "Medina souks", "A maze of lanterns, leather, rugs and spices.", "Varies", "Haggle with a smile; start at about half."],
          ["12:00 PM", "Ben Youssef Madrasa", "culture", "Medina", "Stunning 16th-century Islamic college with carved stucco.", "MAD 50", "Midday light fills the courtyard beautifully."],
          ["2:00 PM", "Le Jardin Secret", "nature", "Rue Mouassine", "A peaceful Islamic garden hidden in the medina.", "MAD 100", "Climb the tower for rooftop views."],
          ["5:00 PM", "Traditional hammam", "activity", "Hammam de la Rose", "Steam, black-soap scrub and argan oil massage.", "MAD 450", "Book ahead and bring fresh clothes."],
        ]),
        makeDay("marrakech", 3, "Atlas Mountains escape", "Berber villages, waterfalls and dinner in a riad.", [
          ["8:00 AM", "Drive to the Ourika Valley", "transport", "Ourika Valley road", "One-hour drive past Berber villages into the High Atlas foothills.", "MAD 600", "Shared tours are cheaper but less flexible."],
          ["10:30 AM", "Setti Fatma waterfalls hike", "nature", "Setti Fatma", "Hike to a series of waterfalls with a local guide.", "MAD 150", "Wear sturdy shoes; the path is rocky."],
          ["1:30 PM", "Lunch with a Berber family", "food", "Ourika Valley", "Home-cooked tagine and bread from a clay oven.", "MAD 150", "Tip your hosts or bring a small gift."],
          ["8:00 PM", "Dinner in a riad", "food", "Medina", "Candle-lit courtyard dinner with live Gnawa music.", "MAD 400", "Dress smart-casual."],
        ]),
      ],
    },
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    tagline: "Ancient wonders and la dolce vita",
    image: photo("1552832230-c0197dd311b5"),
    gradient: "linear-gradient(135deg, #b45309, #be123c)",
    idealDays: 3,
    bestTime: "Apr–Jun, Sep–Oct",
    budgetLevel: 2,
    tags: ["History", "Food", "Art"],
    prompt: "Rome, Italy: the Colosseum and Forum, the Vatican, baroque piazzas and fountains, and authentic Roman food.",
    sample: {
      title: "Roman Holiday",
      destination: "Rome, Italy",
      summary: "Gladiators, Michelangelo and Bernini by day; carbonara, gelato and Trastevere's lanes by night.",
      bestTime: "April–June and September–October",
      budget: {
        currency: "EUR",
        items: [
          { label: "Accommodation", amount: 450 },
          { label: "Food", amount: 180 },
          { label: "Activities", amount: 90 },
          { label: "Local transport", amount: 25 },
        ],
        total: 745,
      },
      packingList: ["Comfortable walking shoes", "Scarf for church visits", "Refillable water bottle", "Sun hat", "Cross-body bag", "Type L plug adapter"],
      tips: [
        "Refill your bottle at the free nasoni street fountains.",
        "Book the Vatican, Colosseum and Borghese ahead.",
        "Coffee standing at the bar is cheaper than at a table.",
        "Small shops often close for a few hours after lunch.",
      ],
      days: [
        makeDay("rome", 1, "Ancient Rome", "The Colosseum, the Forum and an evening in Trastevere.", [
          ["8:30 AM", "Colosseum", "sight", "Piazza del Colosseo", "Stand inside the 2,000-year-old amphitheater of the gladiators.", "€18", "Book the first entry slot online."],
          ["11:00 AM", "Roman Forum & Palatine Hill", "culture", "Via della Salara Vecchia", "Temples and basilicas at the heart of the empire.", "Included", "Same ticket as the Colosseum; bring water."],
          ["1:30 PM", "Pasta lunch in Monti", "food", "Monti district", "Cacio e pepe and carbonara in a neighborhood trattoria.", "€20", "Skip places with picture menus near the sights."],
          ["6:00 PM", "Trastevere evening", "nightlife", "Trastevere", "Ivy-covered lanes, lively piazzas and wine bars.", "€30", "Try supplì, fried rice balls, from a street stall."],
        ]),
        makeDay("rome", 2, "Vatican & baroque piazzas", "Michelangelo's masterpieces and the city's grandest squares.", [
          ["8:00 AM", "Vatican Museums & Sistine Chapel", "culture", "Vatican City", "The Raphael Rooms and Michelangelo's ceiling.", "€20", "Shoulders and knees must be covered."],
          ["12:00 PM", "St. Peter's Basilica", "sight", "Vatican City", "Michelangelo's dome and his Pietà.", "Free", "Climb the dome for the best view in Rome."],
          ["2:00 PM", "Pizza al taglio at Pizzarium", "food", "Via della Meloria", "Inventive Roman pizza by the slice.", "€10", "Go early; there's barely any seating."],
          ["5:00 PM", "Pantheon & Piazza Navona", "sight", "Centro Storico", "A 2,000-year-old dome with an open oculus, then Bernini's fountains.", "€5", "Book Pantheon tickets online."],
        ]),
        makeDay("rome", 3, "Fountains & gardens", "Coins in the Trevi, Bernini sculptures and a sunset terrace.", [
          ["8:30 AM", "Trevi Fountain", "sight", "Piazza di Trevi", "Baroque masterpiece. Toss a coin to ensure your return.", "Free", "Early morning is the only quiet time."],
          ["10:00 AM", "Spanish Steps", "sight", "Piazza di Spagna", "Grand staircase up to Trinità dei Monti.", "Free", "Sitting on the steps is fined."],
          ["12:00 PM", "Borghese Gallery", "culture", "Villa Borghese", "Bernini sculptures and Caravaggio paintings.", "€15", "Reservations are mandatory, in 2-hour slots."],
          ["4:00 PM", "Villa Borghese & Pincio Terrace", "nature", "Pincio Terrace", "Row a boat on the lake, then watch the sunset over the domes.", "€3", "Grab gelato at Fatamorgana on the way."],
        ]),
      ],
    },
  },
];

/** Fills the 1-3 "$" budget indicator text. */
export function budgetLabel(level: Destination["budgetLevel"]): string {
  return ["Budget-friendly", "Mid-range", "Premium"][level - 1];
}
