package ws.finson.wifix.app;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.Charset;
import java.nio.file.FileSystems;
import java.nio.file.Files;

import nu.xom.Attribute;
import nu.xom.Document;
import nu.xom.Element;
import nu.xom.Elements;
import nu.xom.Nodes;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ws.tuxi.lib.cfg.ApplicationComponent;
import ws.tuxi.lib.cfg.ConfigurationException;
import ws.tuxi.lib.pipeline.PipelineOperation;
import ws.tuxi.lib.pipeline.PipelineOperationException;

/**
 * This WriteCSVFromColumnarXML reads a DAP analysis tree and outputs a CSV file.
 * 
 * @author Doug Johnson, Nov 14, 2014
 * 
 */
public class WriteCSVFromColumnarXML implements PipelineOperation<Document, Document> {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    private String sinkName = null;
    private PrintWriter sinkWriter = null;

    /**
     * @param ac
     *            the containing ApplicationComponent
     * @param cE
     *            the Element from the config file that defines this object
     * @throws IOException
     * @throws ConfigurationException
     */
    public WriteCSVFromColumnarXML(ApplicationComponent ac, Element cE) throws IOException,
            ConfigurationException {

        // Process each of the configuration sections

        Elements sectionElements = cE.getChildElements();
        for (int idx = 0; idx < sectionElements.size(); idx++) {
            Element sectionElement = sectionElements.get(idx);
            logger.debug("Begin section element <{}>", sectionElement.getLocalName());
            if ("file".equals(sectionElement.getLocalName())) {
                if (sinkName != null) {
                    logger.warn("Ignoring extra <{}> definition, only one is allowed.",
                            sectionElement.getLocalName());
                } else {
                    sinkName = sectionElement.getValue();
                    sinkWriter = new PrintWriter(Files.newBufferedWriter(FileSystems.getDefault()
                            .getPath(".", sinkName), Charset.defaultCharset()));
                }
            } else {
                logger.warn("Skipping <{}> element. Element not recognized.",
                        sectionElement.getLocalName());
            }
        }
        if (sinkName == null) {
            throw new ConfigurationException("Name of the sink file must be specified.");
        }
    }

    /**
     * @see ws.tuxi.lib.pipeline.PipelineOperation#doStep(java.lang.Object)
     */
    // @Override
    // public Document doStep(Document tree)
    // throws PipelineOperationException {
    //
    // sinkWriter.println(tree.toXML());
    // sinkWriter.close();
    // return tree;
    // }
    //
    // }
    // }

    /**
     * This code copies any "column" Elements out of the XML file and writes them to a CSV file. The
     * column header is the column's "label" attribute. The column contents are the values of each
     * column child element.
     * 
     * @see ws.tuxi.lib.pipeline.PipelineOperation#doStep(java.lang.Object)
     */
    @Override
    public Document doStep(Document in) throws PipelineOperationException {

        // Get all the columns

        Nodes columns = in.getRootElement().query("*//column");
        if (columns.size() == 0) {
            throw new PipelineOperationException("No 'column' elements found.");
        }

        // Check that the columns all have labels and have the same number of children

        Integer rowCount = null;
        for (int idx = 0; idx < columns.size(); idx++) {
            Element col = (Element) columns.get(idx);
            Attribute labelAttribute = col.getAttribute("label");
            if (labelAttribute == null) {
                throw new PipelineOperationException("Column " + Integer.toString(idx)
                        + " has no label attribute.");
            }
            int count = col.getChildCount();
            if (rowCount == null) {
                rowCount = count;
            } else {
                if (count != rowCount) {
                    throw new PipelineOperationException("Column " + Integer.toString(idx)
                            + " is not the same length as the first column.");
                }
            }
        }

        logger.debug("Col x Row : {} x {}", columns.size(), rowCount);

        // Write the CSV file header rows

        StringBuilder buf = new StringBuilder();
        for (int idx = 0; idx < columns.size(); idx++) {
            Element col = (Element) columns.get(idx);
            Attribute labelAttribute = col.getAttribute("label");
            buf.append(labelAttribute.getValue() + ", ");
            logger.trace(labelAttribute.getValue());
        }
        buf.setLength(buf.length() - 2);
        sinkWriter.println(buf.toString());

        // Write the CSV file value rows

        buf = new StringBuilder();
        for (int rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            buf.setLength(0);
            for (int colIndex = 0; colIndex < columns.size(); colIndex++) {
                Element col = (Element) columns.get(colIndex);
                Element val = (Element) col.getChild(rowIndex);
                buf.append(val.getValue() + ", ");
            }
            buf.setLength(buf.length() - 2);
            sinkWriter.println(buf.toString());
        }

        sinkWriter.close();
        
        return in;
    }

}
