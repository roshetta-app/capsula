/**
 * src/lib/favouriteQueries.js
 *
 * S11 (2026-11-26): the server calls of the two favourites hooks (drugs and conditions, and drug classes),
 * moved out of useFavourites.js and useFavouriteClasses.js so this area talks to the server from one file.
 * Each function returns the same query object the hooks already used (it can be awaited or chained with
 * .then), so the hooks behave exactly as before.
 */

import { supabase } from './supabase'

/** Add (nowFavourited true) or remove one favourite drug or condition. */
export function buildFavouriteQuery(userId, itemType, id, nowFavourited) {
  return nowFavourited
    ? supabase.from('favourites').upsert(
        { user_id: userId, item_type: itemType, item_id: id },
        { onConflict: 'user_id,item_type,item_id' }
      )
    : supabase.from('favourites').delete()
        .eq('user_id', userId).eq('item_type', itemType).eq('item_id', id)
}

/** The signed-in person's favourites, oldest first (index 0 oldest, last index newest). The order is explicit
 *  because FavouritesScreen's "recently added" tab is this order reversed. */
export function fetchFavouriteRows() {
  return supabase
    .from('favourites')
    .select('item_type, item_id')
    .order('created_at', { ascending: true })
}

/** The signed-in person's favourite drug classes, oldest first. */
export function fetchFavouriteClassRows() {
  return supabase
    .from('favourite_classes')
    .select('class_name, family_name')
    .order('created_at', { ascending: true })
}

/** Add or remove one favourite drug class. */
export function writeFavouriteClass(userId, className, familyName, nowFavourited) {
  return nowFavourited
    ? supabase.from('favourite_classes').upsert(
        { user_id: userId, class_name: className, family_name: familyName },
        { onConflict: 'user_id,class_name,family_name' }
      )
    : supabase.from('favourite_classes').delete()
        .eq('user_id', userId).eq('class_name', className).eq('family_name', familyName)
}
