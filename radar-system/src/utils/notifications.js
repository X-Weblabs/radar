export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } else {
    console.log('Notification permission not granted');
    return null;
  }
};

export const notifyDriverDispatch = (callDetails) => {
  return sendNotification('New Emergency Dispatch', {
    body: `Location: ${callDetails.address}\nDescription: ${callDetails.description}`,
    tag: 'dispatch',
    requireInteraction: true,
    vibrate: [200, 100, 200],
  });
};

export const notifyHospitalIncoming = (ambulanceDetails, eta) => {
  return sendNotification('Incoming Emergency Patient', {
    body: `Ambulance ${ambulanceDetails.vehicleNumber} is arriving\nETA: ${eta}\nDriver: ${ambulanceDetails.driverName}`,
    tag: 'incoming-patient',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  });
};

export const notifyDispatchForwarded = (forwardReason) => {
  return sendNotification('Dispatch Forwarded', {
    body: `A dispatch was forwarded.\nReason: ${forwardReason}\nSearching for available driver...`,
    tag: 'forward',
  });
};
