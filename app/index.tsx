import axios from "axios";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  // SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Dialog,
  Menu,
  Button as PaperButton,
  // Text,
  PaperProvider,
  Portal,
  TouchableRipple,
} from "react-native-paper";

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const toTitleCase = (text: string) =>
  text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function App() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();

  const eventCode = "62e23eff6e127";

  const [sessionList, setSessionList] = useState<
    { label: string; value: string }[]
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const [selectedEntrance, setSelectedEntrance] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResponse, setScanResponse] = useState({
    message: "",
    dialogIcon: "",
    dialogColor: "",
  });
  const [visible, setVisible] = useState(false);

  const showDialog = () => setVisible(true);
  const hideDialog = () => setVisible(false);

  const openMenu = () => {
    setMenuVisible(false);
    setTimeout(() => setMenuVisible(true), 50);
  };
  const closeMenu = () => setMenuVisible(false);

  useEffect(() => {
    axios
      .get(`https://accreditation.smartevent.rw/ManageSessions/${eventCode}`)
      .then((res) => {
        console.log("------------>", res.data.data);
        const sessions = res.data.data || [];
        const formattedSessions = sessions.map((s: any) => ({
          label: s.activityname,
          value: s.activity_code,
        }));
        setSessionList(formattedSessions);
      })
      .catch((err) => {
        console.error("Failed to load sessions", err);
        setSessionError("Failed to load entrance sessions");
      })
      .finally(() => {
        setLoadingSessions(false);
      });
  }, []);

  const handleScan = (data: { type: string; data: string }) => {
    if (isScanning || !selectedEntrance) return;

    setIsScanning(true);

    const attendeeCode = data.data;

    if (attendeeCode === "") {
      alert("Invalid QR code");
      setTimeout(() => setIsScanning(false), 1000);
      return;
    }

    const reqData = {
      session_id: selectedEntrance,
      event_code: eventCode,
      badge_id: attendeeCode,
    };

    axios
      .post("https://accreditation.smartevent.rw/ScanRequestApi/", reqData)
      .then((response) => {
        const badge = response?.data?.data;
        if (badge) {
          const company =
            badge.company || badge.organisation || badge.organization;
          const country = badge.country || badge.country_of_residence;

          let message = toTitleCase(badge.fullname);
          if (company) message += `\n${toTitleCase(company)}`;
          if (country) message += `\n${toTitleCase(country)}`;

          setScanResponse({
            message,
            dialogIcon: "check-circle",
            dialogColor: "green",
          });
        } else {
          setScanResponse({
            message: "Invalid badge, please check with the event organizer",
            dialogIcon: "alert-circle",
            dialogColor: "red",
          });
        }
        showDialog();
      })
      .catch(() => {
        setScanResponse({
          message: "Invalid badge",
          dialogIcon: "alert-circle",
          dialogColor: "red",
        });
        showDialog();
      })
      .finally(() => {
        setTimeout(() => {
          setIsScanning(false);
        }, 1000);
      });
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.message}>
          <Text style={{fontSize: 16}}>We need your permission to show the camera</Text>
        </View>
        <PaperButton mode="contained" onPress={requestPermission}>
          Grant Permission
        </PaperButton>
      </View>
    );
  }

  if (loadingSessions) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text style={{fontSize: 16}}>Loading entrance sessions...</Text>
      </View>
    );
  }

  const selectedLabel =
    sessionList.find((e) => e.value === selectedEntrance)?.label || "";

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <SafeAreaView style={styles.container}>
        <View style={styles.dropdownWrapper}>
          {!selectedEntrance && (
            <Text style={{ color: 'red', marginBottom: 6, fontSize: 16 }}>
              Please select a forum
            </Text>
          )}
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <TouchableOpacity onPress={openMenu} style={styles.dropdownButton} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, color: '#000', flex: 1, paddingLeft: 15, paddingVertical: 8 }}>
                    {selectedLabel || 'Select Forum'}
                  </Text>
                  <View style={{ marginLeft: 8, marginRight: 10 }}>
                    <Text style={{ fontSize: 18, color: '#888' }}>▼</Text>
                  </View>
                </View>
              </TouchableOpacity>
            }
          >
            <ScrollView style={{ maxHeight: Dimensions.get("window").height * 0.7, width: "100%" }}>
              {sessionList.map((entrance) => (
                <TouchableRipple
                  key={entrance.value}
                  onPress={() => {
                    setSelectedEntrance(entrance.value);
                    closeMenu();
                  }}
                  rippleColor="rgba(0, 0, 0, .1)"
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    width: Dimensions.get("window").width - 32,
                    borderBottomWidth: 1,
                    borderBottomColor: "#ccc",
                  }}
                >
                  <Text style={{ color: "#000", fontSize: 16, flexWrap: "wrap" }}>
                    {entrance.label}
                  </Text>
                </TouchableRipple>
              ))}
            </ScrollView>
          </Menu>
        </View>

        <View>
          <Image
            style={styles.logo}
            source={require("../assets/images/icon.png")}
          />
          <Text style={{ margin: 10, color: "black", textAlign: "center" }}>
            Selected: {selectedLabel}
          </Text>
        </View>

        <CameraView
          style={styles.camera}
          facing={facing}
          onBarcodeScanned={handleScan}
        />

        <Portal>
          <Dialog visible={visible} onDismiss={hideDialog}>
            <Dialog.Icon
              icon={scanResponse?.dialogIcon}
              color={scanResponse?.dialogColor}
            />
            <Dialog.Title style={styles.titleAlert}>
              {scanResponse?.message}
            </Dialog.Title>
            <Dialog.Actions style={styles.centered}>
              <View style={styles.button}>
                <PaperButton onPress={hideDialog}>OK</PaperButton>
              </View>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
    backgroundColor: "#fff",
  },
  dropdownWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    zIndex: 10,
  },
  dropdownButton: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    paddingVertical: 6,
  },
  camera: {
    width: 300,
    height: 300,
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: 20,
  },
  titleAlert: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#000",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: 200,
    marginTop: 20,
  },
  refreshPage: {
    marginTop: 20,
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: "center",
    resizeMode: "contain",
    marginBottom: 10,
    borderRadius: 10,
    marginTop: "8%",
  },
});
