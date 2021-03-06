package ws.finson.wifix.app;

import java.io.BufferedOutputStream;
import java.io.BufferedWriter;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import nu.xom.Document;
import nu.xom.Element;
import nu.xom.Elements;
import nu.xom.Node;
import nu.xom.Nodes;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ws.tuxi.lib.cfg.ApplicationComponent;
import ws.tuxi.lib.cfg.ConfigurationException;
import ws.tuxi.lib.pipeline.PipelineOperation;
import ws.tuxi.lib.pipeline.PipelineOperationException;

/**
 * This ExportTableToCSV class writes one or more nodesets to a table in a file. Each column
 * comprises one nodeset. The output file can be in text (CSV) or binary (bin).
 * 
 * @author Doug Johnson, Nov 14, 2014
 * 
 */
public class ExportTableToCSV implements PipelineOperation<Document, Document> {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    private List<ConfiguredNodeSet> selectors = new ArrayList<>();

    private List<ConfiguredPathname> sinkPathnames = new ArrayList<>();
    private List<BufferedOutputStream> binOut = new ArrayList<>();
    private List<BufferedWriter> csvOut = new ArrayList<>();

    /**
     * @param ac
     *            the containing ApplicationComponent
     * @param cE
     *            the Element from the config file that defines this object.
     *            <table summary="Valid child elements">
     *            <tr><th>Element</th><th>Description</th></tr>
     *            <tr><td>file</td><td>{@link ConfiguredPathname ConfiguredPathname}</td></tr>
     *            <tr><td>nodes</td><td>{@link ConfiguredNodeSet ConfiguredNodeSet}</td></tr>
     *            </table>
     * @throws IOException
     * @throws ConfigurationException
     */
    public ExportTableToCSV(ApplicationComponent ac, Element cE) throws IOException,
            ConfigurationException {

        // Process each of the configuration sections

        Elements sectionElements = cE.getChildElements();
        for (int idx = 0; idx < sectionElements.size(); idx++) {
            Element sectionElement = sectionElements.get(idx);
            logger.debug("Begin section element <{}>", sectionElement.getLocalName());
            if ("file".equals(sectionElement.getLocalName())) {
                sinkPathnames.add(new ConfiguredPathname(sectionElement));
            } else if ("nodes".equals(sectionElement.getLocalName())) {
                selectors.add(new ConfiguredNodeSet(sectionElement));
            } else {
                logger.warn("Skipping <{}> element. Element not recognized.",
                        sectionElement.getLocalName());
            }
        }
    }

    /**
     * 
     * @see ws.tuxi.lib.pipeline.PipelineOperation#doStep(java.lang.Object)
     */
    @Override
    public Document doStep(Document in) throws PipelineOperationException {

        Element globalContextElement = in.getRootElement().getFirstChildElement("context");
        for (ConfiguredPathname cpn : sinkPathnames) {
            Path theSinkPath = cpn.getSinkPath(globalContextElement);
            String format = FilenameUtils.getExtension(theSinkPath.toString());
            switch (format) {
            case "csv":
                BufferedWriter printer;
                try {
                    logger.info("Opening file '{}' for CSV export.",theSinkPath.toString());
                    printer = Files.newBufferedWriter(theSinkPath, Charset.defaultCharset());
                } catch (IOException e) {
                    throw new PipelineOperationException(e);
                }
                csvOut.add(printer);
                break;
            case "bin":
            case "raw":
                BufferedOutputStream binStreamer;
                try {
                    logger.info("Opening file '{}' for binary export.",theSinkPath.toString());
                    binStreamer = new BufferedOutputStream(new FileOutputStream(cpn.getSinkPath(
                            globalContextElement).toFile()));
                } catch (IOException e) {
                    throw new PipelineOperationException(e);
                }
                binOut.add(binStreamer);
                break;
            default:
                throw new PipelineOperationException("Unrecognized table format: " + format);
            }
        }

        // Get the data to print

        List<Nodes> nodesList = new ArrayList<>(selectors.size());
        int rowCount = 0;
        for (int idx = 0; idx < selectors.size(); idx++) {
            Nodes col = selectors.get(idx).getNodeSet(in);
            nodesList.add(col);
            rowCount = Math.max(rowCount, col.size());
            logger.debug("{} column has {} rows.", selectors.get(idx).getLabel(in), col.size());
        }
        int colCount = nodesList.size();

        // Write the CSV file header row

        try {
            if (csvOut.size() > 0) {
                String[] header = new String[colCount];
                for (int idx = 0; idx < selectors.size(); idx++) {
                    String aLabel = selectors.get(idx).getLabel(in);
                    header[idx] = (aLabel != null) ? aLabel : "Field" + Integer.toString(idx);
                    logger.trace("Field name: {}", aLabel);
                }

                CSVFormat flavor = CSVFormat.RFC4180.withHeader(header);
                List<CSVPrinter> printers = new ArrayList<>(csvOut.size());
                for (BufferedWriter sinkWriter : csvOut) {
                    printers.add(new CSVPrinter(sinkWriter, flavor));
                }

                // Write the CSV file value rows

                String[] values = new String[colCount];
                for (int rowIndex = 0; rowIndex < rowCount; rowIndex++) {
                    for (int colIndex = 0; colIndex < nodesList.size(); colIndex++) {
                        Nodes col = nodesList.get(colIndex);
                        if (rowIndex < col.size()) {
                            Node val = col.get(rowIndex);
                            values[colIndex] = val.getValue();
                        }
                    }
                    for (CSVPrinter p : printers) {
                        p.printRecord(values);
                    }
                }
            }

            // Write the binary file rows

            if (binOut.size() > 0) {
                int dataValue;

                for (int rowIndex = 0; rowIndex < rowCount; rowIndex++) {
                    byte[] byteBuffer = new byte[colCount];
                    int offset = 0;
                    for (int colIndex = 0; colIndex < colCount; colIndex++) {
                        Nodes col = nodesList.get(colIndex);
                        if (rowIndex < col.size()) {
                            Node val = col.get(rowIndex);
                            dataValue = Integer.parseInt(val.getValue());
                        } else {
                            dataValue = 0;
                        }
                        byteBuffer[offset++] = (byte) (dataValue & 0xFF);
                    }
                    for (BufferedOutputStream sinkStreamer : binOut) {
                        try {
                            sinkStreamer.write(byteBuffer);
                            logger.trace("Wrote {} bytes to row {} of binary file.",
                                    byteBuffer.length, rowIndex);
                        } catch (IOException e) {
                            throw new PipelineOperationException(e);
                        }
                    }
                }
            }

            for (BufferedWriter sinkWriter : csvOut) {
                sinkWriter.close();
            }

            for (BufferedOutputStream sinkStreamer : binOut) {
                sinkStreamer.close();
            }
        } catch (IOException e) {
            throw new PipelineOperationException(e);
        }
        return in;
    }
}
