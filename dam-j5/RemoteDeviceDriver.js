// This module provides a Johnny-Five accessible interface to DeviceDriver
// running on a remote Arduino host.  The transport protocol is StandardFirmata
// with the addition of DEVICE_QUERY and DEVICE_RESPONSE.
//
// This module is strict-mode throughout, and it uses some ES6 features.
//
// Doug Johnson, April 2016

let firmata = require("firmata");

class DeviceQueryOpen {

  constructor(unitName,flags) {
    this.action = RDD.ACTION('OPEN');
    this.flags = flags;
    this.register = 0;
    this.requestedByteCount = 0;
    this.unitName = unitName;
  }

  toByteArray() {
    let msgBody = new Buffer(256);
    let index = 0;
    index = msgBody.writeUInt8(this.action,index);
    index = msgBody.writeUInt16LE(this.flags,index);
    index = msgBody.writeInt16LE(this.register,index);
    index = msgBody.writeUInt16LE(this.requestedByteCount,index);
    index = msgBody.writeUInt16LE(0,index);
    index += msgBody.write(this.unitName,index,'utf8');
    index = msgBody.writeUInt8(0,index);

    // console.log("msgBody (out) length: ", index);
    // console.log("msgBody (out): ",msgBody.slice(0,index));

    let s = msgBody.toString("base64",0,index);
    let encodedMsgBody = Uint8Array.from(s, x => x.charCodeAt(0));
    let msgArray =  [RDD.SYSEX('DEVICE_QUERY'), ...encodedMsgBody];

    // console.log("msgArray (out) length: ", msgArray.length);
    // console.log("msgArray (out): ",msgArray);

    // let msgArrayDoppel = msgArray.slice(1,msgArray.length);
    // console.log("encoded msgArrayDoppel length: ", msgArrayDoppel.length);
    // console.log("encoded msgArrayDoppel (arr): ", msgArrayDoppel);

    // let encodedMsgBodyBuffer = Buffer.from([...msgArrayDoppel]);                        // <-- this buffer is all zeroes!
    // console.log("encoded Msg Body Buffer length: ", encodedMsgBodyBuffer.length);
    // console.log("encoded Msg Body Buffer (buf): ", encodedMsgBodyBuffer);

    // let decodedMsgBody = new Buffer(encodedMsgBodyBuffer.toString(),'base64');
    // console.log("decoded Msg Body length: ", decodedMsgBody.length);
    // console.log("decoded Msg Body (b): ", decodedMsgBody);

    return msgArray;
  }
}

/**
 * Define the types and methods needed for the Firmata Remote Device Driver
 * implementation in Javascript.
 */
class RDD {

  sysexDeviceResponseHandler(encodedMsgBody) {
    console.log("sysexDeviceResponseHandler invoked");

    console.log("encoded Msg Body length: ", encodedMsgBody.length);
    console.log("encoded Msg Body (object type?): ", encodedMsgBody);

    let encodedMsgBodyBuffer = new Buffer(encodedMsgBody);
    console.log("encoded Msg Body Buffer length: ", encodedMsgBodyBuffer.length);
    console.log("encoded Msg Body Buffer (buf): ", encodedMsgBodyBuffer);

    let msgBody = new Buffer(encodedMsgBodyBuffer.toString(),'base64');
    console.log("decoded Msg Body length: ", msgBody.length);
    console.log("decoded Msg Body (b): ", msgBody);

    let index = 0;
    let action = msgBody.readUInt8(index);
    index += 1;
    let handle = msgBody.readUInt16LE(index);
    index += 2;
    let register = msgBody.readInt16LE(index);
    index += 2;
    let requestedByteCount = msgBody.readUInt16LE(index);
    index += 2;
    let status = msgBody.readInt16LE(index);
    index += 2;
    console.log(`DeviceResponse Status: ${status}`);
    console.log(`DeviceResponse Body: action: ${action}, handle: ${handle}, register: ${register}, requested byte count: ${requestedByteCount}`);
  }

  constructor(opts) {
    console.log("RDD constructor",Object.keys(opts));
    if ('board' in opts) {
      this.board = opts.board;
    } else {
      throw new Error("A 'board' property must be specified to the RDD constructor.");
    }
    this.board.sysexResponse(RDD.SYSEX('DEVICE_RESPONSE'), this.sysexDeviceResponseHandler);
  }

  open(unitName, flags) {
    console.info("RDD open: ",unitName);
    let message = new DeviceQueryOpen(unitName,flags);
    this.board.sysexCommand(message.toByteArray());
    return 1;
  }

  read(handle, reg, count,buf) {
    console.info("RDD read: ",reg,count);
    return count;
  }

  write(handle, reg, count, buf) {
    console.info("RDD write: ",reg,count);
    return count;
  }

  close(handle) {
    console.info("RDD close",handle);
    return this.STATUS.ESUCCESS;
  }

  /**
   * Define the Firmata op codes that the RemoteDeviceDriver module uses.
   */
  static SYSEX(key) {
    let obj = {
      'DEVICE_QUERY' : 0x30,
      'DEVICE_RESPONSE' :0x31
    };
    return obj[key];
}

  /**
   * The action codes that indicate the type of query we are making
   */
  static ACTION(key) {
    let obj = {
      'OPEN' : 0,
      'READ' : 1,
      'WRITE' : 2,
      'CLOSE' : 3
    };
    return obj[key];
  }

  /**
   * Define the status indicators that can be returned by a remote device driver.
   * The list is copied from C/Linux errno.h, except that we use the negative of
   * the value.
   */
  static STATUS(key) {
    let obj = {
      ESUCCESS : { name : "ESUCCESS", val : 0, msg : "Success" },
      EPERM : { name : "EPERM", val : -1, msg : "Operation not permitted" },
      ENOENT : { name : "ENOENT", val : -2, msg : "No such file or directory" },
      ESRCH : { name : "ESRCH", val : -3, msg : "No such process" },
      EINTR : { name : "EINTR", val : -4, msg : "Interrupted system call" },
      EIO : { name : "EIO", val : -5, msg : "I/O error" },
      ENXIO : { name : "ENXIO", val : -6, msg : "No such device or address" },
      E2BIG : { name : "E2BIG", val : -7, msg : "Argument list too long" },
      ENOEXEC : { name : "ENOEXEC", val : -8, msg : "Exec format error" },
      EBADF : { name : "EBADF", val : -9, msg : "Bad file number" },
      ECHILD : { name : "ECHILD", val : -10, msg : "No child processes" },
      EAGAIN : { name : "EAGAIN", val : -11, msg : "Try again" },
      EWOULDBLOCK : { name : "EWOULDBLOCK", val : -11, msg : "Operation would block"},  // duplicate of EAGAIN
      ENOMEM : { name : "ENOMEM", val : -12, msg : "Out of memory" },
      EACCES : { name : "EACCES", val : -13, msg : "Permission denied" },
      EFAULT : { name : "EFAULT", val : -14, msg : "Bad address" },
      ENOTBLK : { name : "ENOTBLK", val : -15, msg : "Block device required" },
      EBUSY : { name : "EBUSY", val : -16, msg : "Device or resource busy" },
      EEXIST : { name : "EEXIST", val : -17, msg : "File exists" },
      EXDEV : { name : "EXDEV", val : -18, msg : "Cross-device link" },
      ENODEV : { name : "ENODEV", val : -19, msg : "No such device" },
      ENOTDIR : { name : "ENOTDIR", val : -20, msg : "Not a directory" },
      EISDIR : { name : "EISDIR", val : -21, msg : "Is a directory" },
      EINVAL : { name : "EINVAL", val : -22, msg : "Invalid argument" },
      ENFILE : { name : "ENFILE", val : -23, msg : "File table overflow" },
      EMFILE : { name : "EMFILE", val : -24, msg : "Too many open files" },
      ENOTTY : { name : "ENOTTY", val : -25, msg : "Not a typewriter" },
      ETXTBSY : { name : "ETXTBSY", val : -26, msg : "Text file busy" },
      EFBIG : { name : "EFBIG", val : -27, msg : "File too large" },
      ENOSPC : { name : "ENOSPC", val : -28, msg : "No space left on device" },
      ESPIPE : { name : "ESPIPE", val : -29, msg : "Illegal seek" },
      EROFS : { name : "EROFS", val : -30, msg : "Read-only file system" },
      EMLINK : { name : "EMLINK", val : -31, msg : "Too many links" },
      EPIPE : { name : "EPIPE", val : -32, msg : "Broken pipe" },
      EDOM : { name : "EDOM", val : -33, msg : "Math argument out of domain of func" },
      ERANGE : { name : "ERANGE", val : -34, msg : "Math result not representable" },
      EDEADLK : { name : "EDEADLK", val : -35, msg : "Resource deadlock would occur" },
      EDEADLOCK : { name : "EDEADLOCK", val : -35, msg : "Resource deadlock would occur" },   // duplicate of EDEADLK
      ENAMETOOLONG : { name : "ENAMETOOLONG", val : -36, msg : "File name too long" },
      ENOLCK : { name : "ENOLCK", val : -37, msg : "No record locks available" },
      ENOSYS : { name : "ENOSYS", val : -38, msg : "Function not implemented at all" },
      ENOTEMPTY : { name : "ENOTEMPTY", val : -39, msg : "Directory not empty" },
      ELOOP : { name : "ELOOP", val : -40, msg : "Too many symbolic links encountered" },
      ENOMSG : { name : "ENOMSG", val : -42, msg : "No message of desired type" },
      EIDRM : { name : "EIDRM", val : -43, msg : "Identifier removed" },
      ECHRNG : { name : "ECHRNG", val : -44, msg : "Channel number out of range" },
      EL2NSYNC : { name : "EL2NSYNC", val : -45, msg : "Level 2 not synchronized" },
      EL3HLT : { name : "EL3HLT", val : -46, msg : "Level 3 halted." },
      EL3RST : { name : "EL3RST", val : -47, msg : "Level 3 reset" },
      ELNRNG : { name : "ELNRNG", val : -48, msg : "Link number out of range" },
      EUNATCH : { name : "EUNATCH", val : -49, msg : "Protocol driver not attached" },
      ENOCSI : { name : "ENOCSI", val : -50, msg : "No CSI structure available" },
      EL2HLT : { name : "EL2HLT", val : -51, msg : "Level 2 halted" },
      EBADE : { name : "EBADE", val : -52, msg : "Invalid exchange" },
      EBADR : { name : "EBADR", val : -53, msg : "Invalid request descriptor" },
      EXFULL : { name : "EXFULL", val : -54, msg : "Exchange full" },
      ENOANO : { name : "ENOANO", val : -55, msg : "No anode" },
      EBADRQC : { name : "EBADRQC", val : -56, msg : "Invalid request code" },
      EBADSLT : { name : "EBADSLT", val : -57, msg : "Invalid slot" },
      EBFONT : { name : "EBFONT", val : -59, msg : "Bad font file format" },
      ENOSTR : { name : "ENOSTR", val : -60, msg : "Device not a stream" },
      ENODATA : { name : "ENODATA", val : -61, msg : "No data available" },
      ETIME : { name : "ETIME", val : -62, msg : "Timer expired" },
      ENOSR : { name : "ENOSR", val : -63, msg : "Out of streams resources" },
      ENONET : { name : "ENONET", val : -64, msg : "Machine is not on the network" },
      ENOPKG : { name : "ENOPKG", val : -65, msg : "Package not installed" },
      EREMOTE : { name : "EREMOTE", val : -66, msg : "Object is remote" },
      ENOLINK : { name : "ENOLINK", val : -67, msg : "Link has been severed" },
      EADV : { name : "EADV", val : -68, msg : "Advertise error" },
      ESRMNT : { name : "ESRMNT", val : -69, msg : "Srmount error" },
      ECOMM : { name : "ECOMM", val : -70, msg : "Communication error on send" },
      EPROTO : { name : "EPROTO", val : -71, msg : "Protocol error" },
      EMULTIHOP : { name : "EMULTIHOP", val : -72, msg : "Multihop attempted" },
      EDOTDOT : { name : "EDOTDOT", val : -73, msg : "RFS specific error" },
      EBADMSG : { name : "EBADMSG", val : -74, msg : "Not a data message" },
      EOVERFLOW : { name : "EOVERFLOW", val : -75, msg : "Value too large for defined data type" },
      ENOTUNIQ : { name : "ENOTUNIQ", val : -76, msg : "Name not unique on network" },
      EBADFD : { name : "EBADFD", val : -77, msg : "File descriptor in bad state" },
      EREMCHG : { name : "EREMCHG", val : -78, msg : "Remote address changed" },
      ELIBACC : { name : "ELIBACC", val : -79, msg : "Can not access a needed shared library" },
      ELIBBAD : { name : "ELIBBAD", val : -80, msg : "Accessing a corrupted shared library" },
      ELIBSCN : { name : "ELIBSCN", val : -81, msg : ".lib section in a.out corrupted" },
      ELIBMAX : { name : "ELIBMAX", val : -82, msg : "Attempting to link in too many shared libraries" },
      ELIBEXEC : { name : "ELIBEXEC", val : -83, msg : "Cannot exec a shared library directly" },
      EILSEQ : { name : "EILSEQ", val : -84, msg : "Illegal byte sequence" },
      ERESTART : { name : "ERESTART", val : -85, msg : "Interrupted system call should be restarted" },
      ESTRPIPE : { name : "ESTRPIPE", val : -86, msg : "Streams pipe error" },
      EUSERS : { name : "EUSERS", val : -87, msg : "Too many users" },
      ENOTSOCK : { name : "ENOTSOCK", val : -88, msg : "Socket operation on non-socket" },
      EDESTADDRREQ : { name : "EDESTADDRREQ", val : -89, msg : "Destination address required" },
      EMSGSIZE : { name : "EMSGSIZE", val : -90, msg : "Message too long or too short" },
      EPROTOTYPE : { name : "EPROTOTYPE", val : -91, msg : "Protocol wrong type for socket" },
      ENOPROTOOPT : { name : "ENOPROTOOPT", val : -92, msg : "Protocol not available" },
      EPROTONOSUPPORT : { name : "EPROTONOSUPPORT", val : -93, msg : "Protocol not supported" },
      ESOCKTNOSUPPORT : { name : "ESOCKTNOSUPPORT", val : -94, msg : "Socket type not supported" },
      EOPNOTSUPP : { name : "EOPNOTSUPP", val : -95, msg : "Operation not supported on transport endpoint" },
      EPFNOSUPPORT : { name : "EPFNOSUPPORT", val : -96, msg : "Protocol family not supported" },
      EAFNOSUPPORT : { name : "EAFNOSUPPORT", val : -97, msg : "Address family not supported by protocol" },
      EADDRINUSE : { name : "EADDRINUSE", val : -98, msg : "Address already in use" },
      EADDRNOTAVAIL : { name : "EADDRNOTAVAIL", val : -99, msg : "Cannot assign requested address" },
      ENETDOWN : { name : "ENETDOWN", val : -100, msg : "Network is down" },
      ENETUNREACH : { name : "ENETUNREACH", val : -101, msg : "Network is unreachable" },
      ENETRESET : { name : "ENETRESET", val : -102, msg : "Network dropped connection because of reset" },
      ECONNABORTED : { name : "ECONNABORTED", val : -103, msg : "Software caused connection abort" },
      ECONNRESET : { name : "ECONNRESET", val : -104, msg : "Connection reset by peer" },
      ENOBUFS : { name : "ENOBUFS", val : -105, msg : "No buffer space available" },
      EISCONN : { name : "EISCONN", val : -106, msg : "Transport endpoint is already connected" },
      ENOTCONN : { name : "ENOTCONN", val : -107, msg : "Transport endpoint is not connected" },
      ESHUTDOWN : { name : "ESHUTDOWN", val : -108, msg : "Cannot send after transport endpoint shutdown" },
      ETOOMANYREFS : { name : "ETOOMANYREFS", val : -109, msg : "Too many references: cannot splice" },
      ETIMEDOUT : { name : "ETIMEDOUT", val : -110, msg : "Connection timed out" },
      ECONNREFUSED : { name : "ECONNREFUSED", val : -111, msg : "Connection refused" },
      EHOSTDOWN : { name : "EHOSTDOWN", val : -112, msg : "Host is down" },
      EHOSTUNREACH : { name : "EHOSTUNREACH", val : -113, msg : "No route to host" },
      EALREADY : { name : "EALREADY", val : -114, msg : "Operation already in progress" },
      EINPROGRESS : { name : "EINPROGRESS", val : -115, msg : "Operation now in progress" },
      ESTALE : { name : "ESTALE", val : -116, msg : "Stale NFS file handle" },
      EUCLEAN : { name : "EUCLEAN", val : -117, msg : "Structure needs cleaning" },
      ENOTNAM : { name : "ENOTNAM", val : -118, msg : "Not a XENIX named type file" },
      ENAVAIL : { name : "ENAVAIL", val : -119, msg : "No XENIX semaphores available" },
      EISNAM : { name : "EISNAM", val : -120, msg : "Is a named type file" },
      EREMOTEIO : { name : "EREMOTEIO", val : -121, msg : "Remote I/O error" },
      EDQUOT : { name : "EDQUOT", val : -122, msg : "Quota exceeded" },
      ENOMEDIUM : { name : "ENOMEDIUM", val : -123, msg : "No medium found" },
      EMEDIUMTYPE : { name : "EMEDIUMTYPE", val : -124, msg : "Wrong medium type" },
      ECANCELED : { name : "ECANCELED", val : -125, msg : "Operation Canceled" },
      ENOKEY : { name : "ENOKEY", val : -126, msg : "Required key not available" },
      EKEYEXPIRED : { name : "EKEYEXPIRED", val : -127, msg : "Key has expired" },
      EKEYREVOKED : { name : "EKEYREVOKED", val : -128, msg : "Key has been revoked" },
      EKEYREJECTED : { name : "EKEYREJECTED", val : -129, msg : "Key was rejected by service" },
      EOWNERDEAD : { name : "EOWNERDEAD", val : -130, msg : "Owner died" },
      ENOTRECOVERABLE : { name : "ENOTRECOVERABLE", val : -131, msg : "State not recoverable" },

      // DeviceDriver status code additions

      ENOTSUP : { name : "ENOTSUP", val : -150, msg : "Parameter values are valid, but the functionality they request is not available" },
      EPANIC : { name : "EPANIC", val : -151, msg : "Executing code that was supposed to be unreachable." }
    };
    return obj[key];
  }
}

module.exports = RDD;
