import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders'; 

const teams = defineCollection({
  loader: file("src/data/teams.json"),
  schema: z.object({
    id: z.number(),
    school: z.string(),
    mascot: z.string().nullable(),
    abbreviation: z.string().nullable(),
    alt_name1: z.string().nullable(),
    alt_name2: z.string().nullable(),
    alt_name3: z.string().nullable(),
    conference: z.string().nullable(),
    classification: z.string().nullable(),
    color: z.string().nullable(),
    alt_color: z.string().nullable(),
    location: z.object({
      venue_id: z.number().nullable(),
      name: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      zip: z.string().nullable(),
      country_code: z.string().nullable(),
      timezone: z.string().nullable(),
      latitude: z.coerce.number().nullable(),
      longitude: z.coerce.number().nullable(),
      elevation: z.coerce.number().nullable(),
      capacity: z.number().nullable(),
      year_constructed: z.number().nullable(),
      grass: z.coerce.boolean(),
      dome: z.coerce.boolean()
    })
  }),
});

const bowlseasons = defineCollection({
  loader: glob({pattern: "**/*.json", base: "./src/data/bowls"}),
  schema: z.array(z.object({
    id: z.number(),
    start_date: z.coerce.date(),
    attendance: z.coerce.number().nullable(),
    venue_id: z.coerce.number().nullable(),
    venue: z.string().nullable(),
    home_id: z.number(),
    home_conference: z.string().nullable(),
    home_points: z.number(),
    away_id: z.number(),
    away_conference: z.string().nullable(),
    away_points: z.number(),
    notes: z.string(),
  }))
})

export const collections = { teams, bowlseasons };