import { useEffect, useState } from 'react';
import { destinationApi } from '../services/api';

// One request per page load, shared by every component that needs the list.
let cached = null;

/** Part 10 — all destinations (for pickers). */
export const useDestinationList = () => {
  const [list, setList] = useState(cached ?? []);
  useEffect(() => {
    if (cached) return undefined;
    let active = true;
    destinationApi
      .list()
      .then((res) => {
        cached = res.data;
        if (active) setList(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return list;
};

export default useDestinationList;
