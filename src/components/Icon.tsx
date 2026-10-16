// Line icons (Lucide set) drawn from small pictures and tinted to any colour.
// Same look on every phone, unlike emoji.

import { Image, type ImageStyle, type StyleProp } from "react-native";

import { categoryDef } from "../data/categories";
import { colors } from "../theme";

const ICONS = {
  home: require("../../assets/images/icons/home.png"),
  apple: require("../../assets/images/icons/apple.png"),
  beef: require("../../assets/images/icons/beef.png"),
  baby: require("../../assets/images/icons/baby.png"),
  hammer: require("../../assets/images/icons/hammer.png"),
  car: require("../../assets/images/icons/car.png"),
  "book-open": require("../../assets/images/icons/book-open.png"),
  package: require("../../assets/images/icons/package.png"),
  bag: require("../../assets/images/icons/bag.png"),
  wallet: require("../../assets/images/icons/wallet.png"),
  user: require("../../assets/images/icons/user.png"),
  search: require("../../assets/images/icons/search.png"),
  bell: require("../../assets/images/icons/bell.png"),
  "chevron-right": require("../../assets/images/icons/chevron-right.png"),
  "chevron-left": require("../../assets/images/icons/chevron-left.png"),
  plus: require("../../assets/images/icons/plus.png"),
  grid: require("../../assets/images/icons/grid.png"),
  basket: require("../../assets/images/icons/basket.png"),
  smartphone: require("../../assets/images/icons/smartphone.png"),
  tv: require("../../assets/images/icons/tv.png"),
  shirt: require("../../assets/images/icons/shirt.png"),
  sofa: require("../../assets/images/icons/sofa.png"),
  sprout: require("../../assets/images/icons/sprout.png"),
  sparkles: require("../../assets/images/icons/sparkles.png"),
  utensils: require("../../assets/images/icons/utensils.png"),
  "heart-pulse": require("../../assets/images/icons/heart-pulse.png"),
  more: require("../../assets/images/icons/more.png"),
  store: require("../../assets/images/icons/store.png"),
  bike: require("../../assets/images/icons/bike.png"),
  shield: require("../../assets/images/icons/shield.png"),
  "arrow-up-right": require("../../assets/images/icons/arrow-up-right.png"),
  list: require("../../assets/images/icons/list.png"),
  star: require("../../assets/images/icons/star.png"),
  x: require("../../assets/images/icons/x.png"),
  "map-pin": require("../../assets/images/icons/map-pin.png"),
  minus: require("../../assets/images/icons/minus.png"),
  trash: require("../../assets/images/icons/trash.png"),
  lock: require("../../assets/images/icons/lock.png"),
  alert: require("../../assets/images/icons/alert.png"),
  truck: require("../../assets/images/icons/truck.png"),
  check: require("../../assets/images/icons/check.png"),
  card: require("../../assets/images/icons/card.png"),
  clock: require("../../assets/images/icons/clock.png"),
  phone: require("../../assets/images/icons/phone.png"),
  refresh: require("../../assets/images/icons/refresh.png"),
  camera: require("../../assets/images/icons/camera.png"),
  info: require("../../assets/images/icons/info.png"),
  logout: require("../../assets/images/icons/logout.png"),
  file: require("../../assets/images/icons/file.png"),
  download: require("../../assets/images/icons/download.png"),
  settings: require("../../assets/images/icons/settings.png"),
  users: require("../../assets/images/icons/users.png"),
  chart: require("../../assets/images/icons/chart.png"),
  megaphone: require("../../assets/images/icons/megaphone.png"),
  gift: require("../../assets/images/icons/gift.png"),
  mail: require("../../assets/images/icons/mail.png"),
  pencil: require("../../assets/images/icons/pencil.png"),
  navigation: require("../../assets/images/icons/navigation.png"),
  receipt: require("../../assets/images/icons/receipt.png"),
  key: require("../../assets/images/icons/key.png"),
  help: require("../../assets/images/icons/help.png"),
  eye: require("../../assets/images/icons/eye.png"),
  calendar: require("../../assets/images/icons/calendar.png"),
  power: require("../../assets/images/icons/power.png"),
  copy: require("../../assets/images/icons/copy.png"),
  pause: require("../../assets/images/icons/pause.png"),
};

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  color = colors.ink,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size, tintColor: color }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

// Icon for each product category (see src/data/categories.ts).
export function categoryIcon(category: string): IconName {
  return category === "All" ? "grid" : (categoryDef(category)?.icon ?? "more");
}
