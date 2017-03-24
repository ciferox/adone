#include "adone.h"

#if ADONE_OS_WINDOWS

int getCursorPosition(int *const rowptr, int *const colptr)
{
    HANDLE hConsole;
    CONSOLE_SCREEN_BUFFER_INFO consoleInfo;

    hConsole = CreateFileW(L"CONOUT$", GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);

    if (hConsole == INVALID_HANDLE_VALUE) {
        return GetLastError();
    }

    if (!GetConsoleScreenBufferInfo(hConsole, &consoleInfo)) {
        return GetLastError();
    }

    if (rowptr) {
        *rowptr = consoleInfo.dwCursorPosition.Y + 1;
    }

    if (colptr) {
        *colptr = consoleInfo.dwCursorPosition.X + 1;
    }

    return 0;
}

#else

#include <fcntl.h>
#include <termios.h>

#define RD_EOF -1
#define RD_EIO -2

static inline int rd(const int fd)
{
    unsigned char buffer[4];
    ssize_t n;

    while (1) {
        n = read(fd, buffer, 1);

        if (n > (ssize_t)0) {
            return buffer[0];
        }
        else if (n == (ssize_t)0) {
            return RD_EOF;
        }
        else if (n != (ssize_t)-1) {
            return RD_EIO;
        }
        else if (errno != EINTR && errno != EAGAIN && errno != EWOULDBLOCK) {
            return RD_EIO;
        }
    }
}

static inline int wr(const int fd, const char *const data, const size_t bytes)
{
    const char *head = data;
    const char *const tail = data + bytes;
    ssize_t n;

    while (head < tail) {
        n = write(fd, head, (size_t)(tail - head));

        if (n > (ssize_t)0) {
            head += n;
        }
        else if (n != (ssize_t)-1) {
            return EIO;
        }
        else if (errno != EINTR && errno != EAGAIN && errno != EWOULDBLOCK) {
            return errno;
        }
    }

    return 0;
}

int getCursorPosition(int *const rowptr, int *const colptr)
{
    struct termios saved;
    struct termios temporary;
    int tty;
    int retval;
    int result;
    int rows;
    int cols;
    int saved_errno;
    const char *dev;

    dev = ttyname(STDIN_FILENO);
    if (!dev) {
        dev = ttyname(STDOUT_FILENO);
    }

    if (!dev) {
        dev = ttyname(STDERR_FILENO);
    }

    if (!dev) {
        errno = ENOTTY;
        return errno;
    }

    do {
        tty = open(dev, O_RDWR | O_NOCTTY);
    } while (tty == -1 && errno == EINTR);

    if (tty == -1) {
        return ENOTTY;
    }

    saved_errno = errno;

    /* Save current terminal settings. */
    do {
        result = tcgetattr(tty, &saved);
    } while (result == -1 && errno == EINTR);

    if (result == -1) {
        retval = errno;
        errno = saved_errno;
        return retval;
    }

    /* Get current terminal settings for basis, too. */
    do {
        result = tcgetattr(tty, &temporary);
    } while (result == -1 && errno == EINTR);

    if (result == -1) {
        retval = errno;
        errno = saved_errno;
        return retval;
    }

    /* Disable ICANON, ECHO, and CREAD. */
    temporary.c_lflag &= ~ICANON;
    temporary.c_lflag &= ~ECHO;
    temporary.c_cflag &= ~CREAD;

    /* This loop is only executed once. When broken out,
     * the terminal settings will be restored, and the function
     * will return retval to caller. It's better than goto.
     */
    do {
        /* Set modified settings. */
        do {
            result = tcsetattr(tty, TCSANOW, &temporary);
        } while (result == -1 && errno == EINTR);

        if (result == -1) {
            retval = errno;
            break;
        }

        /* Request cursor coordinates from the terminal. */
        retval = wr(tty, "\033[6n", 4);
        if (retval) {
            break;
        }

        /* Assume coordinate reponse parsing fails. */
        retval = EIO;

        /* Expect an ESC. */
        result = rd(tty);
        if (result != 27) {
            break;
        }

        /* Expect [ after the ESC. */
        result = rd(tty);
        if (result != '[') {
            break;
        }

        /* Parse rows. */
        rows = 0;
        result = rd(tty);
        while (result >= '0' && result <= '9') {
            rows = 10 * rows + result - '0';
            result = rd(tty);
        }

        if (result != ';') {
            break;
        }

        /* Parse cols. */
        cols = 0;
        result = rd(tty);
        while (result >= '0' && result <= '9') {
            cols = 10 * cols + result - '0';
            result = rd(tty);
        }

        if (result != 'R') {
            break;
        }

        if (rowptr) {
            *rowptr = rows;
        }

        if (colptr) {
            *colptr = cols;
        }

        retval = 0;
    } while (0);

    /* Restore saved terminal settings. */
    do {
        result = tcsetattr(tty, TCSANOW, &saved);
    } while (result == -1 && errno == EINTR);

    if (result == -1 && !retval) {
        retval = errno;
    }

    return retval;
}

#endif // ADONE_OS_WINDOWS

class Terminal : public node::ObjectWrap
{
public:

	static void Initialize(v8::Handle<v8::Object> target)
	{
		Nan::HandleScope scope;
		v8::Local<v8::FunctionTemplate> t = Nan::New<v8::FunctionTemplate>(New);
		t->InstanceTemplate()->SetInternalFieldCount(1);
		Nan::SetMethod(t, "getCursorPos", Terminal::GetCursorPos);
		Nan::Set(target, Nan::New<v8::String>("Terminal").ToLocalChecked(), t->GetFunction());
	}

protected:

	static NAN_METHOD(New)
	{
		Nan::HandleScope scope;
		Terminal* term = new Terminal();
		term->Wrap(info.This());
		info.GetReturnValue().Set(info.This());
	}

	static NAN_METHOD(GetCursorPos)
	{
		Nan::HandleScope scope;
        int row = 0;
        int col = 0;

        if (getCursorPosition(&row, &col)) {
            info.GetReturnValue().SetUndefined();
            return;
        }

        if (row < 1 || col < 1) {
            info.GetReturnValue().SetUndefined();
            return;
        }

        v8::Local<v8::Object> result = Nan::New<Object>();
        result->Set(NanStr("row"), Nan::New<Integer>(row));
        result->Set(NanStr("col"), Nan::New<Integer>(col));
        info.GetReturnValue().Set(result);
	}
};

void init(v8::Handle<v8::Object> target)
{
	Nan::HandleScope scope;
	Terminal::Initialize(target);
}

NODE_MODULE(terminal, init)