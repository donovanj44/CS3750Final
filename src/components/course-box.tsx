import { Text, View } from "react-native";

export default function CourseBox(name: string, desc: string) {
  return (
    <View>
      <Text>{name}</Text>
      <Text>{desc}</Text>
    </View>
  );
}
