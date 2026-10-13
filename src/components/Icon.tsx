// Line icons (Lucide set) drawn from small pictures and tinted to any colour.
// Same look on every phone, unlike emoji.

import { Image, type ImageStyle, type StyleProp } from "react-native";

import { colors } from "../theme";

const ICONS = {
  home: require("../../assets/images/icons/home.png"),
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

// Icon for each product category.
export function categoryIcon(category: string): IconName {
  switch (category) {
    case "All":
      return "grid";
    case "Groceries":
      return "basket";
    case "Phones":
      return "smartphone";
    case "Electronics":
      return "tv";
    case "Fashion":
      return "shirt";
    case "Household":
      return "sofa";
    case "Agriculture":
      return "sprout";
    case "Beauty":
      return "sparkles";
    case "Food":
      return "utensils";
    case "Health":
      return "heart-pulse";
    default:
      return "more";
  }
}
